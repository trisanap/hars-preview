// ─── AI API Client ─────────────────────────────────────────────────────────────
// Two API configs: text (DeepSeek) + vision (Groq Llama 4 Scout).
// Configs stored in sessionStorage (survives page refresh, cleared on tab close).

const TEXT_STORAGE_KEY = "hars_ai_config";
const VISION_STORAGE_KEY = "hars_vision_config";

const TEXT_DEFAULTS = {
  apiKey: "",
  endpoint: "https://api.deepseek.com/v1/chat/completions",
  model: "deepseek-chat-v4",
};

const VISION_DEFAULTS = {
  apiKey: "",
  endpoint: "https://api.groq.com/openai/v1/chat/completions",
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
};

let textCache = null;
let visionCache = null;

// ─── Text AI (DeepSeek) ──────────────────────────────────────────────────────

export function getAIConfig() {
  if (textCache) return textCache;
  try {
    const raw = sessionStorage.getItem(TEXT_STORAGE_KEY);
    if (raw) { textCache = { ...TEXT_DEFAULTS, ...JSON.parse(raw) }; return textCache; }
  } catch {}
  return { ...TEXT_DEFAULTS };
}

export function setAIConfig(partial) {
  const cur = getAIConfig();
  textCache = { ...cur, ...partial };
  sessionStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(textCache));
}

export function clearAIConfig() {
  textCache = null;
  sessionStorage.removeItem(TEXT_STORAGE_KEY);
}

export function hasAIConfig() {
  const c = getAIConfig();
  return !!c.apiKey && !!c.endpoint;
}

// ─── Vision AI (Groq Llama 4 Scout) ──────────────────────────────────────────

export function getVisionConfig() {
  if (visionCache) return visionCache;
  try {
    const raw = sessionStorage.getItem(VISION_STORAGE_KEY);
    if (raw) { visionCache = { ...VISION_DEFAULTS, ...JSON.parse(raw) }; return visionCache; }
  } catch {}
  return { ...VISION_DEFAULTS };
}

export function setVisionConfig(partial) {
  const cur = getVisionConfig();
  visionCache = { ...cur, ...partial };
  sessionStorage.setItem(VISION_STORAGE_KEY, JSON.stringify(visionCache));
}

export function clearVisionConfig() {
  visionCache = null;
  sessionStorage.removeItem(VISION_STORAGE_KEY);
}

export function hasVisionConfig() {
  const c = getVisionConfig();
  return !!c.apiKey && !!c.endpoint;
}

// ─── Core API calls ──────────────────────────────────────────────────────────

async function callAPI(messages, opts = {}) {
  const config = getAIConfig();
  return callAPIWithConfig(config, messages, opts);
}

async function callVisionAPI(messages, opts = {}) {
  const config = getVisionConfig();
  return callAPIWithConfig(config, messages, opts);
}

async function callAPIWithConfig(config, messages, opts = {}) {
  if (!config.apiKey) throw new Error("API key not configured.");
  if (!config.endpoint) throw new Error("API endpoint not configured.");

  const body = {
    model: config.model,
    messages,
    max_tokens: opts.maxTokens ?? 2000,
    temperature: opts.temperature ?? 0.3,
  };

  const resp = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let detail = "";
    try {
      const err = await resp.json();
      detail = err.error?.message || JSON.stringify(err);
    } catch {
      detail = resp.statusText;
    }
    throw new Error(`API error (${resp.status}): ${detail}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Vision API (image -> text extraction) ───────────────────────────────────

export async function extractImageText(imageDataUrl, prompt) {
  const base64 = imageDataUrl.split(",")[1];
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
      ],
    },
  ];
  return callVisionAPI(messages, { temperature: 0.1, maxTokens: 1000 });
}

// ─── Text API ────────────────────────────────────────────────────────────────

export async function chat(messages, opts = {}) {
  return callAPI(messages, opts);
}

// ─── OCR prompt ──────────────────────────────────────────────────────────────

export const OCR_PROMPT = `Anda adalah asisten ekstraksi data label produk halal. Analisis gambar label kemasan produk berikut dan ekstrak informasi dalam format JSON:

{
  "productName": "Nama produk atau bahan",
  "producer": "Nama produsen atau manufaktur",
  "halalCertId": "Nomor sertifikat halal (biasanya dimulai dengan ID diikuti angka)"
}

Aturan:
- Jika suatu field tidak ditemukan dalam gambar, isi dengan string kosong
- productName: nama produk utama atau nama bahan yang tertera pada label
- producer: nama perusahaan/produsen yang tercantum
- halalCertId: nomor sertifikat halal (format: IDxxxxxxxxxxxxxx)
- Hanya kembalikan JSON valid, tanpa teks lain, tanpa markdown formatting`;

// ─── Parse AI JSON response ──────────────────────────────────────────────────

export function parseJSONResponse(text) {
  // direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // JSON in markdown code block
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    try {
      return JSON.parse(m[1].trim());
    } catch {}
  }

  // find top-level {...}
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) {
    try {
      return JSON.parse(brace[0]);
    } catch {}
  }

  return null;
}

// ─── AI not configured warning modal ────────────────────────────────────────

export function showAIWarning(featureName = "AI") {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Plus Jakarta Sans',sans-serif;";

  const box = document.createElement("div");
  box.style.cssText = "background:#fff;border-radius:8px;padding:24px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.2);text-align:center;";

  box.innerHTML = `
    <div style="font-size:40px;margin-bottom:12px;">&#9888;</div>
    <div style="font-size:15px;font-weight:700;color:#14202b;margin-bottom:8px;">Fitur ${featureName} Tidak Tersedia</div>
    <div style="font-size:12px;color:#7588a0;line-height:1.6;margin-bottom:20px;">
      Fitur ini memerlukan kunci API (API Key) yang belum dikonfigurasi.<br/>
      Buka <b>&#9881; Pengaturan</b> di navbar atas untuk mengatur API Key.
    </div>
    <button id="aiwarn-close" style="background:#0a6fc0;color:#fff;border:none;border-radius:4px;padding:8px 24px;font-size:12px;font-weight:600;cursor:pointer;">Mengerti</button>
    <button id="aiwarn-settings" style="background:transparent;color:#0a6fc0;border:none;border-radius:4px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;margin-left:8px;">Buka Pengaturan</button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("#aiwarn-close").onclick = close;
  overlay.querySelector("#aiwarn-settings").onclick = () => {
    close();
    window.dispatchEvent(new CustomEvent("hars:open-settings"));
  };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
}

