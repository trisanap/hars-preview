import { useState } from "react";
import { getAIConfig, setAIConfig, clearAIConfig, getVisionConfig, setVisionConfig, clearVisionConfig } from "./ai.jsx";

const C = {
  blue: "#0a6fc0", blueMid: "#075aa0", blueLight: "#cfe5f5", blueUltraLight: "#eaf3fb",
  gold: "#b8860b", goldLight: "#fdf8e8", red: "#c0392b", redLight: "#fce4ec",
  green: "#1b5e20", greenLight: "#e8f5e9",
  text: "#14202b", muted: "#7588a0", faint: "#9aabbf",
  border: "#d9e2ec", borderLight: "#ecf1f6", bg: "#fff", bgAlt: "#f6f8fb",
};
const font = "'Plus Jakarta Sans', sans-serif";

const TABS = [
  { key: "ai", label: "AI Teks (DeepSeek)" },
  { key: "vision", label: "AI Vision (Groq)" },
  { key: "about", label: "Tentang" },
];

function AIConfigForm({ label, description, getConfig, setConfig, clearConfig, storageNote }) {
  const [saved, setSaved] = useState(false);
  const cfg = getConfig();
  const [form, setForm] = useState({ endpoint: cfg.endpoint, apiKey: cfg.apiKey, model: cfg.model });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const saveAI = () => { setConfig(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const clearAI = () => { clearConfig(); setForm({ endpoint: "", apiKey: "", model: "" }); };

  const inp = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 4, padding: "7px 10px", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: font };
  const lblStyle = { fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 };

  return <div>
    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.text }}>{label}</div>
    <div style={{ fontSize: 11, color: C.faint, marginBottom: 14, lineHeight: 1.4 }}>{description}</div>
    <div style={{ marginBottom: 14 }}>
      <label style={lblStyle}>API Endpoint</label>
      <input value={form.endpoint} onChange={f("endpoint")} style={inp} placeholder="https://api.example.com/v1/chat/completions" />
    </div>
    <div style={{ marginBottom: 14 }}>
      <label style={lblStyle}>API Key</label>
      <input value={form.apiKey} onChange={f("apiKey")} type="password" style={inp} placeholder="sk-xxxxxxxxxxxxxxxx" />
    </div>
    <div style={{ marginBottom: 14 }}>
      <label style={lblStyle}>Model</label>
      <input value={form.model} onChange={f("model")} style={inp} placeholder="model-name" />
    </div>
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <button onClick={saveAI} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
        {saved ? "✓ Tersimpan" : "Simpan"}
      </button>
      <button onClick={clearAI} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
        Hapus Konfigurasi
      </button>
    </div>
    <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.5, background: C.bgAlt, padding: "10px 12px", borderRadius: 4 }}>
      {storageNote}
    </div>
  </div>;
}

export default function SettingsModal({ onClose }) {
  const [tab, setTab] = useState("ai");

  const inp = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 4,
    padding: "7px 10px", fontSize: 13, outline: "none",
    boxSizing: "border-box", fontFamily: font,
  };
  const lbl = {
    fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.bg, borderRadius: 8, width: "100%", maxWidth: 520,
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)", fontFamily: font,
        overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          background: C.blue, color: "#fff", padding: "12px 16px",
          fontWeight: 600, fontSize: 13, display: "flex",
          justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <span>⚙ Pengaturan</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#fff",
            cursor: "pointer", fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", borderBottom: `2px solid ${C.borderLight}`,
          padding: "0 16px", flexShrink: 0,
        }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: "none", border: "none",
              borderBottom: tab === t.key ? `2px solid ${C.blue}` : "2px solid transparent",
              marginBottom: -2, color: tab === t.key ? C.blue : C.muted,
              padding: "8px 14px", fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
              cursor: "pointer", fontFamily: font, transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {tab === "ai" && (
            <AIConfigForm
              label="Konfigurasi AI Teks"
              description="Untuk batch processing Bahan, chat, dan analisis teks. DeepSeek-v4 dengan 1M context window."
              getConfig={getAIConfig}
              setConfig={setAIConfig}
              clearConfig={clearAIConfig}
              storageNote="API key disimpan di sessionStorage dan akan hilang saat tab ditutup."
            />
          )}

          {tab === "vision" && (
            <AIConfigForm
              label="Konfigurasi AI Vision"
              description="Untuk ekstraksi gambar, OCR label, dan deteksi tanda tangan. Groq Llama 4 Scout dengan vision support."
              getConfig={getVisionConfig}
              setConfig={setVisionConfig}
              clearConfig={clearVisionConfig}
              storageNote="API key disimpan di sessionStorage. Groq mendukung format OpenAI-compatible untuk vision."
            />
          )}

          {tab === "about" && (
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>
              <p><strong>HARS</strong> — Halal Audit Report System</p>
              <p>LPH UIN Syarif Hidayatullah Jakarta</p>
              <p style={{ color: C.muted, marginTop: 8 }}>
                Sistem audit halal berbasis web. Backend FastAPI + SQLite dengan
                autentikasi JWT. Data tersimpan di server — persisten antar perangkat.
                BPJPH API diproksi melalui backend.
              </p>
              <p style={{ color: C.muted }}>
                Frontend React + Vite. Dokumen diproses dengan jscanify (pemindai),
                pdfjs-dist (PDF), dan xlsx (spreadsheet). AI via DeepSeek-v4 (teks) dan
                Groq Llama 4 Scout (vision) untuk ekstraksi gambar dan verifikasi sertifikat halal.
              </p>
              <p style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.borderLight}`, color: C.faint, fontSize: 11 }}>
                © 2026 Trisan Andrean Putra
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}