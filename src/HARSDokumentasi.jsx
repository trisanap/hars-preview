import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "./api";
import { extractImageText, OCR_PROMPT, parseJSONResponse, hasVisionConfig, showAIWarning } from "./ai.jsx";
import { useLang } from "./i18n";

// ─── jscanify / OpenCV document scanning ───────────────────────────────────
// OpenCV.js is loaded async from CDN in index.html. jscanify is installed via npm.
function useJScanify() {
  const [scanner, setScanner] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      if (window.cv && window.cv.Mat) {
        try {
          // Dynamic import: jscanify/client is the browser version (uses global cv)
          import("jscanify/client").then(mod => {
            if (cancelled) return;
            const JScanify = mod.default || mod;
            const instance = new JScanify();
            setScanner(instance);
            setReady(true);
            setLoading(false);
          }).catch(() => {
            if (!cancelled) setTimeout(check, 500);
          });
        } catch {
          if (!cancelled) setTimeout(check, 500);
        }
      } else {
        setLoading(true);
        setTimeout(check, 500);
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  return { scanner, ready, loading };
}

/** Attempt to extract a document from an image using jscanify.
 *  Returns a dataUrl if successful, or null if scanning fails. */
function scanDocument(scanner, imageDataUrl, width = 1240, height = 1754) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const result = scanner.extractPaper(img, width, height);
        if (result && result.toDataURL) {
          resolve(result.toDataURL("image/jpeg", 0.9));
        } else {
          // Fallback: return enhanced original if document not detected
          const c = document.createElement("canvas");
          c.width = width; c.height = height;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(c.toDataURL("image/jpeg", 0.9));
        }
      } catch (e) {
        console.warn("Document scan failed:", e);
        resolve(imageDataUrl); // fallback to original
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

// ─── Design tokens (mirrored from HARSDashboard) ────────────────────────────
const C = {
  blue: "#0a6fc0", blueMid: "#075aa0", blueLight: "#cfe5f5", blueUltraLight: "#eaf3fb",
  gold: "#b8860b", goldLight: "#fdf8e8", red: "#c0392b", redLight: "#fce4ec",
  green: "#1b5e20", greenLight: "#e8f5e9",
  text: "#14202b", muted: "#7588a0", faint: "#9aabbf",
  border: "#d9e2ec", borderLight: "#ecf1f6", bg: "#fff", bgAlt: "#f6f8fb", bgPage: "#fafbfd",
};
const font = "'Plus Jakarta Sans', sans-serif";
const mono = "'JetBrains Mono', monospace";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

/** Compress a dataURL to max dimension */
function compressImage(dataUrl, maxDim = 2400, quality = 0.92) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const c = document.createElement("canvas");
      c.width = width; c.height = height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

/** Generate thumbnail */
function makeThumb(dataUrl, size = 120) {
  return compressImage(dataUrl, size, 0.6);
}

/** Read File as dataURL */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function formatDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

// ─── Canvas-based image enhancement ──────────────────────────────────────────
function enhanceImage(dataUrl, bw = true) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      const data = imageData.data;
      const w = c.width, h = c.height, total = w * h;

      // Build per-channel histograms for 5% clipping
      const histR = new Uint32Array(256), histG = new Uint32Array(256), histB = new Uint32Array(256);
      for (let i = 0; i < data.length; i += 4) {
        histR[data[i]]++; histG[data[i+1]]++; histB[data[i+2]]++;
      }
      const clip = total * 0.05;
      const findClip = (hist) => {
        let lo = 0, hi = 255, s = 0;
        while (lo < 255 && s < clip) s += hist[lo++];
        s = 0;
        while (hi > 0 && s < clip) s += hist[hi--];
        return [lo, hi];
      };
      const [rLo, rHi] = findClip(histR);
      const [gLo, gHi] = findClip(histG);
      const [bLo, bHi] = findClip(histB);

      // Gentle auto-contrast with clipped range
      const out = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i += 4) {
        out[i]   = rHi > rLo ? Math.max(0, Math.min(255, ((data[i]   - rLo) / (rHi - rLo)) * 255)) : data[i];
        out[i+1] = gHi > gLo ? Math.max(0, Math.min(255, ((data[i+1] - gLo) / (gHi - gLo)) * 255)) : data[i+1];
        out[i+2] = bHi > bLo ? Math.max(0, Math.min(255, ((data[i+2] - bLo) / (bHi - bLo)) * 255)) : data[i+2];
        out[i+3] = data[i+3];
      }

      // Lighter sharpen (center weight 3 instead of 5)
      const K = [0, -1, 0, -1, 3, -1, 0, -1, 0];
      const sharp = new Uint8ClampedArray(data.length);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            let val = 0;
            for (let ky = -1; ky <= 1; ky++)
              for (let kx = -1; kx <= 1; kx++)
                val += out[((y + ky) * w + (x + kx)) * 4 + ch] * K[(ky + 1) * 3 + (kx + 1)];
            sharp[idx + ch] = Math.max(0, Math.min(255, val));
          }
          sharp[idx + 3] = out[idx + 3];
        }
      }
      // Copy edges
      for (let i = 0; i < w * 4; i++) { sharp[i] = out[i]; sharp[(h-1)*w*4 + i] = out[(h-1)*w*4 + i]; }
      for (let y = 0; y < h; y++) {
        const l = y*w*4, r = (y*w+w-1)*4;
        sharp[l]=out[l];sharp[l+1]=out[l+1];sharp[l+2]=out[l+2];sharp[l+3]=out[l+3];
        sharp[r]=out[r];sharp[r+1]=out[r+1];sharp[r+2]=out[r+2];sharp[r+3]=out[r+3];
      }

      // Adaptive threshold — only in B&W, larger window, gentler constant
      if (bw) {
        const WS = 12; // 25x25 window
        const THRESH_CONST = 12;
        for (let y = WS; y < h - WS; y++) {
          for (let x = WS; x < w - WS; x++) {
            const idx = (y * w + x) * 4;
            let sum = 0, count = 0;
            for (let wy = -WS; wy <= WS; wy++)
              for (let wx = -WS; wx <= WS; wx++) {
                const p = ((y + wy) * w + (x + wx)) * 4;
                sum += sharp[p] * 0.299 + sharp[p+1] * 0.587 + sharp[p+2] * 0.114;
                count++;
              }
            const mean = sum / count;
            const gray = sharp[idx] * 0.299 + sharp[idx+1] * 0.587 + sharp[idx+2] * 0.114;
            const val = gray > mean - THRESH_CONST ? 255 : 0;
            sharp[idx] = val; sharp[idx+1] = val; sharp[idx+2] = val;
          }
        }
      }

      imageData.data.set(sharp);
      ctx.putImageData(imageData, 0, 0);
      resolve(c.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

// ─── Btn (local copy) ───────────────────────────────────────────────────────
function Btn({ onClick, variant = "primary", children, disabled, small, title, style: extraStyle }) {
  const variants = {
    primary: { bg: C.blue, color: "#fff", border: C.blue },
    secondary: { bg: "transparent", color: C.blue, border: C.blue },
    danger: { bg: C.red, color: "#fff", border: C.red },
    ghost: { bg: "transparent", color: C.muted, border: C.border },
    gold: { bg: C.gold, color: "#fff", border: C.gold },
  };
  const v = variants[variant];
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov && !disabled ? (variant === "primary" ? C.blueMid : variant === "danger" ? "#a93226" : "rgba(0,0,0,0.04)") : v.bg,
        color: v.color, border: `1px solid ${v.border}`,
        borderRadius: 5, padding: small ? "4px 10px" : "6px 14px",
        fontSize: small ? 11 : 12, fontWeight: 600, fontFamily: font,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        display: "inline-flex", alignItems: "center", gap: 5,
        whiteSpace: "nowrap", ...(extraStyle || {}),
      }}
    >{children}</button>
  );
}

// ─── Camera Modal ────────────────────────────────────────────────────────────
function CameraModal({ onCapture, onClose, mode = "environment" }) {
  const { t } = useLang();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState(mode);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { min: 1920 }, height: { min: 1080 } },
          audio: false,
        });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        if (active) setError("Kamera tidak tersedia atau izin ditolak.");
      }
    })();
    return () => { active = false; };
  }, [facingMode]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    if (stream) stream.getTracks().forEach(t => t.stop());
    onCapture(dataUrl);
  };

  const close = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000", zIndex: 2000,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 16px", background: "#111",
      }}>
        <button onClick={close} style={{ background: "none", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: font }}>{t("close")}</button>
        <button onClick={() => setFacingMode(f => f === "environment" ? "user" : "environment")} style={{ background: "none", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: font }}>{t("flipCamera")}</button>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {error ? (
          <div style={{ color: "#fff", fontSize: 13, textAlign: "center", padding: 20, fontFamily: font }}>{error}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
        <button onClick={capture} disabled={!!error} style={{
          width: 64, height: 64, borderRadius: "50%", border: "4px solid #fff",
          background: error ? "#555" : "#fff", cursor: error ? "not-allowed" : "pointer",
        }} />
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

// ─── Image Preview Modal ─────────────────────────────────────────────────────
function ImagePreview({ dataUrl, onClose }) {
  const { t } = useLang();
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      cursor: "pointer",
    }} onClick={onClose}>
      <img src={dataUrl} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }} />
    </div>
  );
}

// ─── Confirm Delete Modal ────────────────────────────────────────────────────
function ConfirmDelete({ name, onConfirm, onClose }) {
  const { t } = useLang();
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.bg, borderRadius: 8, padding: 24, maxWidth: 360, width: "100%",
        fontFamily: font, boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t("deleteItem")}</div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
          {t("deleteItemConfirm")}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
          <Btn variant="danger" onClick={onConfirm}>{t("delete")}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Mode: Label Bahan ───────────────────────────────────────────────────────
function ModeLabelBahan({ regId }) {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileRef = useRef(null);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  // AI extraction
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Manual entry form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productName: "", producer: "", halalCertId: "", notes: "" });

  useEffect(() => {
    (async () => {
      const saved = (await api.getState(`dok_label_${regId}`)).value || [];
      setItems(saved);
    })();
  }, [regId]);

  const saveItems = useCallback(async (newItems) => {
    setItems(newItems);
    await api.setState(`dok_label_${regId}`, newItems);
  }, [regId]);

  const addEntry = async (image, entryData) => {
    const compressed = image ? await compressImage(image) : null;
    const entry = {
      id: Date.now(),
      image: compressed,
      name: entryData.productName || entryData.name || "Label Bahan",
      date: formatDate(),
      data: entryData,
    };
    saveItems([entry, ...items]);
    resetCapture();
  };

  const handleCapture = async (dataUrl) => {
    setShowCamera(false);
    setCapturedImage(dataUrl);
    setEnhancedImage(null);
    setShowForm(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setCapturedImage(dataUrl);
    setEnhancedImage(null);
    setShowForm(false);
    e.target.value = "";
  };

  const handleAIExtract = async () => {
    if (!capturedImage) return;
    if (!hasVisionConfig()) {
      showAIWarning("Ekstraksi Label (Vision)");
      return;
    }
    const img = enhancedImage || capturedImage;
    setAiLoading(true);
    setAiError(null);
    try {
      const text = await extractImageText(img, OCR_PROMPT);
      const data = parseJSONResponse(text);
      if (data) {
        setForm({
          productName: data.productName || "",
          producer: data.producer || "",
          halalCertId: data.halalCertId || "",
          notes: "",
        });
        setShowForm(true);
      } else {
        setAiError("AI tidak dapat mengekstrak data dari gambar. Coba foto ulang dengan pencahayaan lebih baik atau pastikan label terbaca jelas.");
      }
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const saveCaptured = () => {
    const img = enhancedImage || capturedImage;
    addEntry(img, { name: form.productName || "Label Bahan", productName: form.productName, producer: form.producer, halalCertId: form.halalCertId, notes: form.notes });
  };

  const saveManual = () => {
    addEntry(null, { productName: form.productName, producer: form.producer, halalCertId: form.halalCertId, notes: form.notes });
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setEnhancedImage(null);
    setShowForm(false);
    setForm({ productName: "", producer: "", halalCertId: "", notes: "" });
    setAiError(null);
    setAiLoading(false);
  };

  const renameItem = (id, newName) => {
    saveItems(items.map(x => x.id === id ? { ...x, name: newName } : x));
    setRenaming(null);
  };

  const startForm = (withImage) => {
    setShowForm(true);
    if (!withImage) resetCapture();
  };

  return (
    <div>
      {deleteTarget && (
        <ConfirmDelete name={deleteTarget.name} onConfirm={() => {
          saveItems(items.filter(x => x.id !== deleteTarget.id));
          setDeleteTarget(null);
        }} onClose={() => setDeleteTarget(null)} />
      )}

      <div style={{
        background: C.blueLight, border: `1px solid #b0cce8`,
        borderRadius: 5, padding: "10px 14px", marginBottom: 16,
        fontSize: 12, color: C.blue,
      }}>
        📸 Ambil foto kemasan bahan atau masukkan data manual. Foto akan disimpan sebagai dokumentasi label bahan.
      </div>

      {/* Action buttons */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Btn variant="primary" onClick={() => setShowCamera(true)}>
          📷 Buka Kamera
        </Btn>
        <Btn variant="secondary" onClick={() => fileRef.current?.click()}>
          {t("upload")} Gambar
        </Btn>
        <Btn variant="ghost" onClick={() => startForm(false)}>
          ✏ Input Manual
        </Btn>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
      </div>

      {/* Captured image preview */}
      {capturedImage && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden",
            marginBottom: 10, background: "#000", maxWidth: 500,
          }}>
            <img src={enhancedImage || capturedImage} alt="captured"
              style={{ width: "100%", display: "block", cursor: "pointer" }}
              onClick={() => setPreviewUrl(enhancedImage || capturedImage)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Btn variant="gold" small onClick={handleAIExtract} disabled={aiLoading}>
              {aiLoading ? "⏳ Mengekstrak..." : "🤖 AI Ekstrak"}
            </Btn>
            {aiError && (
              <div style={{
                width: "100%", background: "#fce4ec", border: "1px solid #e8b4b4",
                borderRadius: 4, padding: "8px 12px", fontSize: 12, color: "#c0392b",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>{aiError}</span>
                <button onClick={() => setAiError(null)} style={{
                  background: "none", border: "none", color: "#c0392b",
                  cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0,
                }}>✕</button>
              </div>
            )}
            <Btn variant="primary" small onClick={() => startForm(true)}>Lanjutkan →</Btn>
            <Btn variant="ghost" small onClick={resetCapture}>{t("cancelBtn")}</Btn>
          </div>
        </div>
      )}

      {/* Data entry form */}
      {showForm && (
        <div style={{
          border: `1px solid ${C.blue}`, borderRadius: 6,
          padding: "14px 16px", marginBottom: 20, background: C.blueUltraLight,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: C.text }}>
            {capturedImage ? "Data dari Foto" : "Input Manual Data Bahan"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {[
              { key: "productName", label: "Nama Produk / Bahan", placeholder: "Contoh: Anchor Butter" },
              { key: "producer", label: "Produsen", placeholder: "Contoh: PT. Fonterra Brands Indonesia" },
              { key: "halalCertId", label: "No. Sertifikat Halal", placeholder: "Contoh: ID00410000088320221" },
              { key: "notes", label: "Catatan (opsional)", placeholder: "Informasi tambahan..." },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 3 }}>{field.label}</label>
                <input value={form[field.key]} onChange={e => setForm(p => ({...p, [field.key]: e.target.value}))}
                  placeholder={field.placeholder}
                  style={{
                    width: "100%", border: `1px solid ${C.border}`, borderRadius: 4,
                    padding: "6px 10px", fontSize: 12, fontFamily: font,
                    boxSizing: "border-box", background: C.bg,
                  }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" small onClick={capturedImage ? saveCaptured : saveManual}>{t("save")}</Btn>
            <Btn variant="ghost" small onClick={() => setShowForm(false)}>{t("cancel")}</Btn>
          </div>
        </div>
      )}

      {/* Saved items */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: C.text }}>
          Tersimpan ({items.length})
        </div>
        {items.length === 0 ? (
          <div style={{
            padding: "24px", textAlign: "center", color: C.faint, fontSize: 12,
            border: `1px dashed ${C.borderLight}`, borderRadius: 6,
          }}>
            Belum ada data label bahan. Ambil foto atau input manual.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(item => (
              <div key={item.id} style={{
                border: `1px solid ${C.borderLight}`, borderRadius: 6, overflow: "hidden",
                background: C.bg, display: "flex",
              }}>
                <div style={{
                  width: 80, minHeight: 80, background: C.bgAlt,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, cursor: "pointer", overflow: "hidden",
                }} onClick={() => item.image && setPreviewUrl(item.image)}>
                  {item.image ? (
                    <img src={item.image} alt="" style={{ width: 80, height: 80, objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 24, opacity: 0.4 }}>📄</span>
                  )}
                </div>
                <div style={{ flex: 1, padding: "8px 12px", minWidth: 0 }}>
                  {renaming === item.id ? (
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      <input value={renameVal} onChange={e => setRenameVal(e.target.value)} autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") renameItem(item.id, renameVal);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        style={{ flex: 1, border: `1px solid ${C.blue}`, borderRadius: 3, padding: "3px 6px", fontSize: 12, fontFamily: font }} />
                      <Btn small variant="primary" onClick={() => renameItem(item.id, renameVal)}>✓</Btn>
                      <Btn small variant="ghost" onClick={() => setRenaming(null)}>✕</Btn>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                  )}
                  <div style={{ fontSize: 10, color: C.faint, marginBottom: 4 }}>{item.date}</div>
                  {item.data && (
                    <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
                      {item.data.productName && <div>🏷 {item.data.productName}</div>}
                      {item.data.producer && <div>🏭 {item.data.producer}</div>}
                      {item.data.halalCertId && <div>✓ {item.data.halalCertId}</div>}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <Btn small variant="ghost" onClick={() => { setRenaming(item.id); setRenameVal(item.name); }}>✏</Btn>
                    <Btn small variant="ghost" onClick={() => setDeleteTarget(item)}>🗑</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
      {previewUrl && <ImagePreview dataUrl={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
}

// ─── Mode: Foto Audit ────────────────────────────────────────────────────
function ModeFotoFasilitas({ regId }) {
  const { t } = useLang();
  const [photos, setPhotos] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const imgKey = (id) => `dok_fasilitas_img_${regId}_${id}`;

  // Load metadata (fast — no image blobs)
  useEffect(() => {
    (async () => {
      const saved = (await api.getState(`dok_fasilitas_${regId}`)).value || [];
      // Migrate old format: if entries have inline "image", extract to individual keys
      let needsMigration = false;
      for (const p of saved) {
        if (p.image && p.image.length > 50000) {
          needsMigration = true;
          break;
        }
      }
      if (needsMigration) {
        const migrated = [];
        for (const p of saved) {
          if (p.image && p.image.length > 50000) {
            await api.setState(imgKey(p.id), p.image);
            const { image, ...rest } = p;
            migrated.push(rest);
          } else {
            migrated.push(p);
          }
        }
        setPhotos(migrated);
        await api.setState(`dok_fasilitas_${regId}`, migrated);
      } else {
        setPhotos(saved);
      }
    })();
  }, [regId]);

  const addPhoto = async (dataUrl, idx) => {
    const thumb = await makeThumb(dataUrl);
    const id = Date.now() + (idx || 0);
    // Save full image to individual key
    await api.setState(imgKey(id), dataUrl);
    // Use functional update to avoid stale closure in multi-upload loop
    setPhotos(prev => {
      const entry = { id, name: `Foto ${prev.length + 1}`, thumbnail: thumb, date: formatDate() };
      const next = [entry, ...prev];
      api.setState(`dok_fasilitas_${regId}`, next.map(({ image, ...rest }) => rest));
      return next;
    });
  };

  const loadPreview = async (p) => {
    if (p.image) { setPreviewUrl(p.image); return; }
    setPreviewLoading(true);
    try {
      const img = (await api.getState(imgKey(p.id))).value;
      if (img) {
        // Cache in memory
        setPhotos(prev => prev.map(x => x.id === p.id ? { ...x, image: img } : x));
        setPreviewUrl(img);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    try {
      let idx = 0;
      for (const file of files) {
        await addPhoto(await fileToDataURL(file), idx++);
      }
    } finally {
      setUploading(false);
    }
    e.target.value = "";
  };

  const handleCapture = async (dataUrl) => {
    setShowCamera(false);
    await addPhoto(dataUrl, 0);
  };

  const renamePhoto = (id, newName) => {
    setPhotos(prev => {
      const next = prev.map(p => p.id === id ? { ...p, name: newName } : p);
      api.setState(`dok_fasilitas_${regId}`, next);
      return next;
    });
    setRenaming(null);
  };

  const handleDelete = async (target) => {
    await api.setState(imgKey(target.id), null);
    setPhotos(prev => {
      const next = prev.filter(p => p.id !== target.id);
      api.setState(`dok_fasilitas_${regId}`, next);
      return next;
    });
    setDeleteTarget(null);
  };

  return (
    <div>
      {deleteTarget && (
        <ConfirmDelete name={deleteTarget.name} onConfirm={() => handleDelete(deleteTarget)}
          onClose={() => setDeleteTarget(null)} />
      )}

      <div style={{
        background: C.blueLight, border: `1px solid #b0cce8`,
        borderRadius: 5, padding: "10px 14px", marginBottom: 16,
        fontSize: 12, color: C.blue,
      }}>
        📷 Dokumentasi fasilitas produksi: tata letak, peralatan, area produksi, penyimpanan, dan area terkait.
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Btn variant="primary" onClick={() => setShowCamera(true)} disabled={uploading}>{t("takePhoto")}</Btn>
        <Btn variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>{t("upload")}</Btn>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleUpload} />
        {uploading && <span style={{fontSize:11,color:C.muted}}>{t("uploading")}</span>}
      </div>

      {photos.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: C.faint, fontSize: 12, border: `1px dashed ${C.borderLight}`, borderRadius: 6 }}>
          Belum ada foto fasilitas.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {photos.map(p => (
            <div key={p.id} style={{ border: `1px solid ${C.borderLight}`, borderRadius: 6, overflow: "hidden", background: C.bg }}>
              <div style={{
                height: 140, background: C.bgAlt, cursor: "pointer", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
              }} onClick={() => loadPreview(p)}>
                <img src={p.thumbnail || p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ padding: "8px 10px" }}>
                {renaming === p.id ? (
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    <input value={renameVal} onChange={e => setRenameVal(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === "Enter") renamePhoto(p.id, renameVal); if (e.key === "Escape") setRenaming(null); }}
                      style={{ flex: 1, border: `1px solid ${C.blue}`, borderRadius: 3, padding: "3px 6px", fontSize: 11, fontFamily: font }} />
                    <Btn small variant="primary" onClick={() => renamePhoto(p.id, renameVal)}>✓</Btn>
                    <Btn small variant="ghost" onClick={() => setRenaming(null)}>✕</Btn>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2, wordBreak: "break-word" }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: C.faint, marginBottom: 6 }}>{p.date}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn small variant="ghost" onClick={() => { setRenaming(p.id); setRenameVal(p.name); }}>✏</Btn>
                      <Btn small variant="ghost" onClick={() => setDeleteTarget(p)}>🗑</Btn>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
      {previewUrl && <ImagePreview dataUrl={previewUrl} onClose={() => setPreviewUrl(null)} />}
      {previewLoading && <div style={{
        position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:1999,
        display:"flex",alignItems:"center",justifyContent:"center"
      }}><div style={{color:"#fff",fontSize:14}}>{t("loadingImage")}</div></div>}
    </div>
  );
}

// ─── Mode: Dokumen Pendukung ─────────────────────────────────────────────────
function ModeDokumenPendukung({ regId }) {
  const { t } = useLang();
  const [docs, setDocs] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const fileRef = useRef(null);
  const pdfRef = useRef(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingProcessed, setPendingProcessed] = useState(null);

  useEffect(() => {
    (async () => {
      const saved = (await api.getState(`dok_pendukung_${regId}`)).value || [];
      setDocs(saved);
    })();
  }, [regId]);

  const saveDocs = useCallback(async (newDocs) => {
    setDocs(newDocs);
    await api.setState(`dok_pendukung_${regId}`, newDocs);
  }, [regId]);

  const addDoc = async (file) => {
    const dataUrl = await fileToDataURL(file);
    const isPDF = file.type === "application/pdf";
    const doc = {
      id: Date.now(),
      label: newLabel.trim() || file.name.replace(/\.[^.]+$/, ""),
      filename: file.name,
      data: dataUrl,
      type: isPDF ? "pdf" : "image",
      snapshot: isPDF ? null : dataUrl,
      size: formatBytes(file.size),
      date: formatDate(),
    };
    saveDocs([doc, ...docs]);
    setAdding(false);
    setNewLabel("");
  };

  const handleCapture = async (dataUrl) => {
    setShowCamera(false);
    setPendingImage(dataUrl);
    setPendingProcessed(null);
  };

  const handlePDFUpload = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const newDocs = [];
    for (const file of files) {
      const dataUrl = await fileToDataURL(file);
      const isPDF = file.type === "application/pdf";
      newDocs.push({
        id: Date.now() + Math.random(),
        label: newLabel.trim() || file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        data: dataUrl,
        type: isPDF ? "pdf" : "image",
        snapshot: isPDF ? null : dataUrl,
        size: formatBytes(file.size),
        date: formatDate(),
      });
    }
    saveDocs([...newDocs, ...docs]);
    e.target.value = "";
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const newDocs = [];
    for (const file of files) {
      const dataUrl = await fileToDataURL(file);
      newDocs.push({
        id: Date.now() + Math.random(),
        label: newLabel.trim() || file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        data: dataUrl,
        type: "image",
        size: formatBytes(dataUrl.length),
        date: formatDate(),
      });
    }
    saveDocs([...newDocs, ...docs]);
    e.target.value = "";
  };

  const savePending = async () => {
    const finalImage = pendingProcessed || pendingImage;
    if (!finalImage) return;
    const doc = {
      id: Date.now(),
      label: newLabel.trim() || "Dokumen",
      filename: `dokumen_${Date.now()}.jpg`,
      data: finalImage,
      type: "image",
      size: formatBytes(finalImage.length),
      date: formatDate(),
    };
    saveDocs([doc, ...docs]);
    setPendingImage(null);
    setPendingProcessed(null);
    setAdding(false);
    setNewLabel("");
  };

  const cancelPending = () => {
    setPendingImage(null);
    setPendingProcessed(null);
  };

  // Signed audit documents — PDF upload
  const [signedSPK, setSignedSPK] = useState(null); // { name, data, date }
  const [signedHadir, setSignedBerkas] = useState(null);
  const signedFileRef = useRef(null);
  const [signingDoc, setSigningDoc] = useState(null); // "spk" | "hadir" | null
  const [pdfViewer, setPdfViewer] = useState(null); // PDF doc for viewer modal
  useEffect(() => {
    (async () => {
      const s = await api.getState(`signed_${regId}`).then(r => r.value);
      if (s) { try { const d = JSON.parse(s); setSignedSPK(d.spk||null); setSignedBerkas(d.berkas||null); } catch {} }
    })();
  }, [regId]);

  const saveSigned = async (key, file) => {
    const dataUrl = await fileToDataURL(file);
    const doc = { name: file.name, data: dataUrl, date: formatDate() };
    const nextSPK = key === "spk" ? doc : signedSPK;
    const nextBerkas = key === "hadir" ? doc : signedHadir;
    if (key === "spk") setSignedSPK(doc); else setSignedBerkas(doc);
    await api.setState(`signed_${regId}`, JSON.stringify({ spk: nextSPK, berkas: nextBerkas }));
    const tlRaw = await api.getState("tl_"+regId).then(r => r.value);
    const tlData = tlRaw ? (() => { try { return JSON.parse(tlRaw); } catch { return {}; } })() : {};
    tlData.auditSigned = !!(nextSPK && nextBerkas);
    await api.setState("tl_"+regId, JSON.stringify(tlData));
  };

  const handleDeleteSigned = async (key) => {
    const nextSPK = key === "spk" ? null : signedSPK;
    const nextBerkas = key === "hadir" ? null : signedHadir;
    if (key === "spk") setSignedSPK(null); else setSignedBerkas(null);
    await api.setState(`signed_${regId}`, JSON.stringify({ spk: nextSPK, berkas: nextBerkas }));
    const tlRaw = await api.getState("tl_"+regId).then(r => r.value);
    const tlData = tlRaw ? (() => { try { return JSON.parse(tlRaw); } catch { return {}; } })() : {};
    tlData.auditSigned = !!(nextSPK && nextBerkas);
    await api.setState("tl_"+regId, JSON.stringify(tlData));
  };

  const bothSigned = signedSPK && signedHadir;

  return (
    <div>
      {deleteTarget && (
        <ConfirmDelete name={deleteTarget.label} onConfirm={() => {
          saveDocs(docs.filter(d => d.id !== deleteTarget.id));
          setDeleteTarget(null);
        }} onClose={() => setDeleteTarget(null)} />
      )}

      {/* Dokumen Audit Tertandatangani */}
      <div style={{ background: bothSigned ? C.greenLight : C.goldLight,
        border: `1px solid ${bothSigned ? C.green : C.gold}`, borderRadius: 8,
        padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: bothSigned ? C.green : C.gold, marginBottom: 10 }}>
          {bothSigned ? "✓ Dokumen Audit Lengkap" : "📋 Dokumen Audit — Upload PDF hasil scan FairScan"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* SPK */}
          <div style={{ background: C.bg, borderRadius: 6, padding: "10px 12px", border: `1px solid ${C.borderLight}` }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: C.text, marginBottom: 6 }}>{t("signedSPK")}</div>
            {signedSPK ? (
              <div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                  <span style={{ fontSize: 10, color: C.muted }}>📄 {signedSPK.name} · {signedSPK.date}</span>
                  <button onClick={() => handleDeleteSigned("spk")} title="Hapus"
                    style={{ background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:0,lineHeight:1 }}>✕</button>
                </div>
                {signedSPK.data && signedSPK.data.startsWith("data:image") ? (
                  <img src={signedSPK.data} alt="SPK" style={{ width: "100%", maxHeight: 100, objectFit: "contain", borderRadius: 4, cursor: "pointer", border: `1px solid ${C.borderLight}` }}
                    onClick={() => setPreviewUrl(signedSPK.data)} />
                ) : (
                  <div style={{ fontSize: 12, color: C.blue, fontWeight: 500 }}>{t("pdfSaved")} — <a href={signedSPK.data} target="_blank" rel="noopener" style={{ color: C.blue }}>buka</a></div>
                )}
              </div>
            ) : (
              <Btn variant="secondary" small onClick={() => { setSigningDoc("spk"); signedFileRef.current?.click(); }}>{t("uploadPDF")}</Btn>
            )}
          </div>
          {/* Daftar Hadir Audit */}
          <div style={{ background: C.bg, borderRadius: 6, padding: "10px 12px", border: `1px solid ${C.borderLight}` }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: C.text, marginBottom: 6 }}>{t("attendanceListPDF")}</div>
            {signedHadir ? (
              <div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                  <span style={{ fontSize: 10, color: C.muted }}>📄 {signedHadir.name} · {signedHadir.date}</span>
                  <button onClick={() => handleDeleteSigned("hadir")} title="Hapus"
                    style={{ background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:0,lineHeight:1 }}>✕</button>
                </div>
                {signedHadir.data && signedHadir.data.startsWith("data:image") ? (
                  <img src={signedHadir.data} alt="Daftar Hadir Audit" style={{ width: "100%", maxHeight: 100, objectFit: "contain", borderRadius: 4, cursor: "pointer", border: `1px solid ${C.borderLight}` }}
                    onClick={() => setPreviewUrl(signedHadir.data)} />
                ) : (
                  <div style={{ fontSize: 12, color: C.blue, fontWeight: 500 }}>{t("pdfSaved")} — <a href={signedHadir.data} target="_blank" rel="noopener" style={{ color: C.blue }}>buka</a></div>
                )}
              </div>
            ) : (
              <Btn variant="secondary" small onClick={() => { setSigningDoc("hadir"); signedFileRef.current?.click(); }}>{t("uploadPDF")}</Btn>
            )}
          </div>
        </div>
        <input ref={signedFileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }}
          onChange={async e => { const f = e.target.files?.[0]; if (f && signingDoc) { await saveSigned(signingDoc, f); setSigningDoc(null); } e.target.value = ""; }} />
      </div>

      <div style={{
        background: C.blueLight, border: `1px solid #b0cce8`,
        borderRadius: 5, padding: "10px 14px", marginBottom: 16,
        fontSize: 12, color: C.blue,
      }}>
        📄 Upload sertifikat penyelia halal, hasil uji lab, nota pembelian bahan, denah lokasi, diagram alir produksi, dan dokumen pendukung lainnya.
        <div style={{ marginTop: 6, fontSize: 11, color: C.blue, opacity: 0.7 }}>
          {t("fairScanTip")}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {adding ? (
          <div style={{ border: `1px solid ${C.blue}`, borderRadius: 5, padding: "12px 14px", background: C.blueUltraLight }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("docLabel")}</label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Sertifikat Halal Anchor Butter" autoFocus
                style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 10px", fontSize: 12, fontFamily: font, boxSizing: "border-box", background: C.bg }} />
            </div>
            {pendingImage ? (
              <>
                <div style={{
                  border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden",
                  marginBottom: 10, background: "#000", maxWidth: 500,
                }}>
                  <img src={pendingProcessed || pendingImage} alt="preview"
                    style={{ width: "100%", display: "block", cursor: "pointer" }}
                    onClick={() => setPreviewUrl(pendingProcessed || pendingImage)} />
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Btn variant="primary" small onClick={savePending}>{t("save")}</Btn>
                  <Btn variant="ghost" small onClick={cancelPending}>{t("changePhoto")}</Btn>
                  <Btn variant="ghost" small onClick={() => { setAdding(false); setNewLabel(""); setPendingImage(null); setPendingProcessed(null); }}>{t("cancel")}</Btn>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn variant="primary" small onClick={() => pdfRef.current?.click()}>{t("uploadPDF")}</Btn>
                <Btn variant="secondary" small onClick={() => fileRef.current?.click()}>{t("uploadImage")}</Btn>
                <Btn variant="secondary" small onClick={() => setShowCamera(true)}>{t("takePhoto")}</Btn>
                <input ref={pdfRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={handlePDFUpload} />
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} />
                <Btn variant="ghost" small onClick={() => { setAdding(false); setNewLabel(""); }}>{t("cancel")}</Btn>
              </div>
            )}
          </div>
        ) : (
          <Btn variant="primary" onClick={() => setAdding(true)}>{t("addDocument")}</Btn>
        )}
      </div>

      {docs.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: C.faint, fontSize: 12, border: `1px dashed ${C.borderLight}`, borderRadius: 6 }}>
          Belum ada dokumen pendukung.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.bgAlt }}>
              <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{t("label")}</th>
              <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{t("type")}</th>
              <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{t("file")}</th>
              <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{t("date")}</th>
              <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{t("size")}</th>
              <th style={{ padding: "7px 10px", textAlign: "center", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d, i) => (
              <tr key={d.id} style={{ background: i % 2 === 0 ? C.bg : C.bgAlt }}>
                <td style={{ padding: "8px 10px", fontWeight: 500, borderBottom: `1px solid ${C.borderLight}` }}>{d.label}</td>
                <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.borderLight}` }}>{d.type === "pdf" ? "📄 PDF" : "🖼 Gambar"}</td>
                <td style={{ padding: "8px 10px", fontFamily: mono, fontSize: 11, color: C.muted, borderBottom: `1px solid ${C.borderLight}`, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.filename}</td>
                <td style={{ padding: "8px 10px", color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{d.date}</td>
                <td style={{ padding: "8px 10px", color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{d.size}</td>
                <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    {d.type === "pdf" ? (
                      <Btn small variant="ghost" title="Lihat PDF" onClick={() => setPdfViewer(d)}>👁</Btn>
                    ) : (
                      <Btn small variant="ghost" title="Lihat" onClick={() => setPreviewUrl(d.data)}>👁</Btn>
                    )}
                    <Btn small variant="ghost" title="Download" onClick={() => { const a = document.createElement("a"); a.href = d.data; a.download = d.filename; a.click(); }}>⬇</Btn>
                    <Btn small variant="ghost" title="Hapus" onClick={() => setDeleteTarget(d)}>🗑</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
      {previewUrl && <ImagePreview dataUrl={previewUrl} onClose={() => setPreviewUrl(null)} />}
      {pdfViewer && <PDFViewerModal doc={pdfViewer} regId={regId} onClose={() => setPdfViewer(null)}
        onSnapshot={(dataUrl) => {
          const snap = { id: Date.now(), label: `${pdfViewer.label} (hlm snapshot)`, filename: `snapshot_${Date.now()}.jpg`, data: dataUrl, snapshot: dataUrl, type: "image", size: formatBytes(dataUrl.length), date: formatDate() };
          saveDocs([snap, ...docs]);
        }} />}
    </div>
  );
}

// ─── PDF Viewer Modal ───────────────────────────────────────────────────────
function PDFViewerModal({ doc, regId, onClose, onSnapshot }) {
  const { t } = useLang();
  const iframeRef = useRef(null);

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:2000,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:800,maxHeight:"90vh",display:"flex",flexDirection:"column",
      boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
      <div style={{background:C.blue,color:"#fff",padding:"10px 16px",borderRadius:"8px 8px 0 0",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{fontWeight:600,fontSize:13}}>📄 {doc.label}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18}}>×</button>
      </div>
      <div style={{flex:1,overflow:"auto",background:"#525659"}}>
        <iframe ref={iframeRef} src={doc.data} style={{width:"100%",height:"100%",minHeight:500,border:"none"}} title={doc.label} />
      </div>
      <div style={{padding:"10px 16px",borderTop:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",justifyContent:"flex-end",flexShrink:0}}>
        <span style={{fontSize:11,color:C.muted,marginRight:12}}>{t("snapshotHint")}</span>
        <button onClick={onClose}
          style={{background:C.blue,color:"#fff",border:"none",borderRadius:5,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>
          Tutup
        </button>
      </div>
    </div>
  </div>;
}

// ─── Tab: Dokumentasi (main) ────────────────────────────────────────────────
// ─── Mode: Ekstrak TTD ──────────────────────────────────────────────────────
function ModeEkstrakTTD({ regId }) {
  const { t } = useLang();
  const [sigs, setSigs] = useState([]);
  const [labeling, setLabeling] = useState(null);
  const [ttdImage, setTtdImage] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropRect, setCropRect] = useState(null);
  const [aiExtracting, setAiExtracting] = useState(false);
  const ttdFileRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const v = await api.getState(`ttd_extracted_${regId}`).then(r => r.value);
      if (v) { try { setSigs(JSON.parse(v)); } catch {} }
    })();
  }, [regId]);

  const saveSigs = async (updated) => {
    setSigs(updated);
    await api.setState(`ttd_extracted_${regId}`, JSON.stringify(updated));
  };

  const handleUpload = async (file) => {
    const reader = new FileReader();
    reader.onload = () => { setTtdImage(reader.result); setSigs([]); };
    reader.readAsDataURL(file);
  };

  const getImgCoords = (e) => {
    const img = imgRef.current; if (!img) return {x:0,y:0};
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, scaleX, scaleY };
  };

  const handleMouseDown = (e) => {
    if (!ttdImage) return;
    const coords = getImgCoords(e);
    setCropStart(coords);
    setCropRect(null);
    setCropping(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!cropping || !cropStart) return;
    const coords = getImgCoords(e);
    setCropRect({
      x: Math.min(cropStart.x, coords.x), y: Math.min(cropStart.y, coords.y),
      w: Math.abs(coords.x - cropStart.x), h: Math.abs(coords.y - cropStart.y),
    });
  };

  const handleMouseUp = () => {
    if (!cropping || !cropStart || !cropRect || cropRect.w < 10 || cropRect.h < 10) {
      setCropping(false); setCropStart(null); setCropRect(null); return;
    }
    // Crop the selected area
    const img = imgRef.current;
    const cnv = document.createElement("canvas");
    cnv.width = cropRect.w; cnv.height = cropRect.h;
    cnv.getContext("2d").drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
    saveSigs([...sigs, { id: Date.now(), label: `TTD ${sigs.length+1}`, dataUrl: cnv.toDataURL("image/png") }]);
    setCropping(false); setCropStart(null); setCropRect(null);
  };

  const updateLabel = (id, newLabel) => {
    saveSigs(sigs.map(s => s.id === id ? { ...s, label: newLabel } : s));
    setLabeling(null);
  };

  const deleteSig = (id) => saveSigs(sigs.filter(s => s.id !== id));

  const doAIExtract = async () => {
    if (!ttdImage || !hasVisionConfig()) { showAIWarning("Ekstraksi Tanda Tangan (Vision)"); return; }
    setAiExtracting(true);
    try {
      const prompt = 'Find all handwritten signatures in this document. Return ONLY a JSON array: [{"label":"Label near signature","x":pixelX,"y":pixelY,"w":pixelWidth,"h":pixelHeight}]. Include 30px padding around each signature.';
      const text = await extractImageText(ttdImage, prompt);
      const coords = parseJSONResponse(text);
      if (!coords || !Array.isArray(coords) || !coords.length) {
        alert("Tidak ada tanda tangan terdeteksi. Coba crop manual.");
        setAiExtracting(false); return;
      }
      const img = new Image();
      await new Promise(resolve => { img.onload = resolve; img.src = ttdImage; });
      const crops = coords.map((c, i) => {
        const x = Math.max(0, c.x - 30), y = Math.max(0, c.y - 30);
        const w = Math.min(img.width - x, (c.w || 150) + 60), h = Math.min(img.height - y, (c.h || 50) + 60);
        const cnv = document.createElement("canvas");
        cnv.width = w; cnv.height = h;
        cnv.getContext("2d").drawImage(img, x, y, w, h, 0, 0, w, h);
        return { id: Date.now() + i, label: c.label || `TTD ${i+1}`, dataUrl: cnv.toDataURL("image/png") };
      });
      saveSigs(crops);
    } catch (e) {
      alert("Gagal ekstrak: " + e.message);
    }
    setAiExtracting(false);
  };

  return <div>
    <div style={{ marginBottom: 16, fontSize: 12, color: C.muted }}>
      {t("uploadTTDHint")} <strong>🤖 Ekstrak AI</strong> untuk deteksi otomatis, atau <strong>seret (drag)</strong> pada gambar untuk crop manual.
    </div>

    {!ttdImage ? (
      <div style={{ border: `2px dashed ${C.border}`, borderRadius: 8, padding: 24, textAlign: "center", marginBottom: 16 }}>
        <input ref={ttdFileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        <Btn variant="primary" onClick={() => ttdFileRef.current?.click()}>{t("uploadTTD")}</Btn>
        <div style={{ marginTop: 8, fontSize: 11, color: C.faint }}>PDF atau gambar — klik dan seret pada gambar untuk memotong setiap tanda tangan</div>
      </div>
    ) : (
      <>
        <div ref={containerRef} style={{ position:"relative",border:`1px solid ${C.borderLight}`,borderRadius:6,overflow:"hidden",marginBottom:12,maxWidth:700,cursor:cropping?"crosshair":"crosshair",userSelect:"none" }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
          onMouseLeave={()=>{setCropping(false);setCropStart(null);setCropRect(null);}}>
          <img ref={imgRef} src={ttdImage} alt="TTD" style={{ width:"100%",display:"block",pointerEvents:"none" }} draggable={false} />
          {cropRect && imgRef.current && (() => {
            const nw = imgRef.current.naturalWidth, nh = imgRef.current.naturalHeight;
            return (
              <div style={{ position:"absolute",left:(cropRect.x/nw*100)+"%",
                top:(cropRect.y/nh*100)+"%",
                width:(cropRect.w/nw*100)+"%",
                height:(cropRect.h/nh*100)+"%",
                border:"2px solid #0a6fc0",background:"rgba(10,111,192,0.12)",pointerEvents:"none" }} />
            );
          })()}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap:"wrap",alignItems:"center" }}>
          <span style={{ fontSize:11,color:C.muted,display:"flex",alignItems:"center" }}>
            🖱 Seret (drag) pada gambar untuk crop manual
          </span>
          <Btn variant="gold" small onClick={doAIExtract} disabled={aiExtracting}>
            {aiExtracting ? "⏳ AI Mengekstrak..." : "🤖 Ekstrak AI"}
          </Btn>
          <Btn variant="ghost" onClick={() => { setTtdImage(null); setSigs([]); }}>↩ Ganti Gambar</Btn>
        </div>
      </>
    )}

    {sigs.length > 0 && (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 10 }}>
          ✓ {sigs.length} Tanda Tangan Dipotong
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {sigs.map(s => (
            <div key={s.id} style={{ background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 6, padding: 8, textAlign: "center" }}>
              <img src={s.dataUrl} alt={s.label} style={{ width: "100%", height: 60, objectFit: "contain", marginBottom: 6 }} />
              {labeling === s.id ? (
                <input autoFocus value={s.label} onBlur={() => setLabeling(null)}
                  onKeyDown={e => { if (e.key === "Enter") updateLabel(s.id, e.target.value); }}
                  style={{ width: "100%", border: `1px solid ${C.blue}`, borderRadius: 3, padding: "2px 4px", fontSize: 10, textAlign: "center", fontFamily: font, boxSizing: "border-box" }} />
              ) : (
                <div style={{ fontSize: 10, fontWeight: 600, color: C.text, marginBottom: 4, cursor: "pointer" }}
                  onClick={() => setLabeling(s.id)}>{s.label} ✎</div>
              )}
              <button onClick={() => deleteSig(s.id)}
                style={{ background: "none", border: "none", color: C.red, fontSize: 10, cursor: "pointer" }}>{t("delete")}</button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>;
}

const SUB_TABS = [
  { key: "label", label: "Label Bahan", icon: "🏷" },
  { key: "fasilitas", label: "Foto Audit", icon: "🏭" },
  { key: "pendukung", label: "Dokumen Pendukung", icon: "📄" },
  { key: "ttd", label: "Ekstrak TTD", icon: "✍" },
];

export default function TabDokumentasi({ reg }) {
  const { t } = useLang();
  const [subTab, setSubTab] = useState("label");
  const [loading, setLoading] = useState(false);

  const switchTab = (key) => {
    if (key === subTab) return;
    setLoading(true);
    setSubTab(key);
    setTimeout(() => setLoading(false), 300);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `2px solid ${C.borderLight}` }}>
        {SUB_TABS.map(tab => (
          <button key={tab.key} onClick={() => switchTab(tab.key)} style={{
            background: "none", border: "none",
            borderBottom: subTab === tab.key ? `2px solid ${C.blue}` : "2px solid transparent",
            marginBottom: -2, color: subTab === tab.key ? C.blue : C.muted,
            padding: "8px 16px", fontSize: 12, fontFamily: font,
            fontWeight: subTab === tab.key ? 600 : 400,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 13, fontFamily: font }}>t("loadingWithDots")</div>
      ) : (
        <>
          {subTab === "label" && <ModeLabelBahan regId={reg.id} />}
          {subTab === "fasilitas" && <ModeFotoFasilitas regId={reg.id} />}
          {subTab === "pendukung" && <ModeDokumenPendukung regId={reg.id} />}
          {subTab === "ttd" && <ModeEkstrakTTD regId={reg.id} />}
        </>
      )}
    </div>
  );
}
