import { useState } from "react";
import { useAuth } from "./auth";

// ─── SVG Icon Components ──────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.78 19.78 0 0 1 4.22-5.94"/>
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.86 19.86 0 0 1-3.17 4.19"/>
      <path d="m1 1 22 22"/>
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16,flexShrink:0}}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      <path d="M5 12h14"/>
      <path d="m13 5 7 7-7 7"/>
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const STYLES = `
:root {
  --blue:        #0a6fc0;
  --blue-700:    #075aa0;
  --blue-800:    #054278;
  --blue-300:    #6fb0e0;
  --blue-100:    #cfe5f5;
  --blue-50:     #eaf3fb;
  --ink:         #14202b;
  --ink-2:       #3a4a5a;
  --muted:       #7588a0;
  --line:        #d9e2ec;
  --line-soft:   #ecf1f6;
  --paper:       #f6f8fb;
  --paper-2:     #fafbfd;
  --danger:      #c33e3e;
  --shadow-sm:   0 1px 2px rgba(20,32,43,0.05);
  --shadow:      0 4px 18px rgba(20,32,43,0.07);
  --shadow-xl:   0 30px 80px -20px rgba(10,66,120,0.35);
}
.login-page * { box-sizing: border-box; }
.login-page {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  line-height: 1.5;
  min-height: 100vh;
}
/* ── Grid: 50/50 split ── */
.login-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

/* ── LEFT PANEL (brand) ── */
.brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, var(--blue-700) 0%, var(--blue-800) 100%);
  color: #fff;
  padding: 48px 56px;
  overflow: hidden;
}
.brand-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 22px 22px;
  background-position: -1px -1px;
  mask-image: radial-gradient(ellipse 80% 70% at 30% 30%, #000 35%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 30% 30%, #000 35%, transparent 80%);
  pointer-events: none;
}
.brand-panel .corner {
  position: absolute; top: 0; right: 0;
  width: 440px; height: 320px;
  opacity: 0.55; pointer-events: none;
}
.brand-row {
  display: flex; align-items: center; gap: 14px;
}
.brand-row .logo {
  width: 52px; height: 52px; border-radius: 50%;
  background: #fff; padding: 5px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.18);
}
.brand-row .logo img { width: 100%; height: 100%; display: block; object-fit: contain; }
.brand-row .name b {
  display: block; font-weight: 800; font-size: 22px;
  letter-spacing: -0.01em; line-height: 1;
}
.brand-row .name span {
  display: block; font-size: 12px; margin-top: 4px;
  color: rgba(255,255,255,0.75); font-weight: 500; letter-spacing: 0.02em;
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 999px; padding: 5px 12px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
  width: fit-content;
  margin-top: 14px;
}
.eyebrow .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #6df0a8;
  box-shadow: 0 0 0 3px rgba(109,240,168,0.25);
}
.brand-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.brand-headline {
  z-index: 2;
}
.brand-headline h1 {
  font-size: clamp(34px, 3.4vw, 46px); font-weight: 800;
  line-height: 1.05; letter-spacing: -0.02em;
  margin: 0 0 16px; max-width: 480px; text-wrap: balance;
}
.brand-headline p {
  font-size: 15.5px; line-height: 1.6;
  color: rgba(255,255,255,0.85); max-width: 420px;
  margin: 0;
}
.brand-features {
  z-index: 2;
}
.brand-features .features {
  display: flex; flex-direction: column; gap: 10px; max-width: 440px;
  margin-top: 24px;
}
.brand-features .features .item {
  display: flex; gap: 12px; align-items: flex-start;
  font-size: 14px; color: rgba(255,255,255,0.92);
}
.brand-features .features .item .ico {
  flex: 0 0 28px; width: 28px; height: 28px;
  border-radius: 8px; background: rgba(255,255,255,0.14);
  display: grid; place-items: center;
  border: 1px solid rgba(255,255,255,0.18);
}
.brand-foot {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12.5px; color: rgba(255,255,255,0.55);
}
.brand-foot a { color: rgba(255,255,255,0.75); text-decoration: none; }
.brand-foot a:hover { color: #fff; }

/* ── RIGHT PANEL (form) ── */
.form-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: 32px 48px;
}
.form-top {
  text-align: right;
  font-size: 13.5px; color: var(--muted);
}
.form-top a { color: var(--blue); font-weight: 600; text-decoration: none; margin-left: 6px; }
.form-top a:hover { text-decoration: underline; }
.form-headline {
  width: 100%;
}
.form-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-self: center;
  width: 100%;
  max-width: 420px;
}
.form-headline .title {
  font-size: 30px; font-weight: 800; letter-spacing: -0.02em;
  margin: 0 0 8px; line-height: 1.1;
}
.form-headline .subtitle {
  font-size: 15px; color: var(--ink-2);
  margin: 0 0 28px; line-height: 1.55;
}
.form-card-wrap {
  width: 100%;
}
.field { margin-bottom: 16px; }
.field label {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; font-weight: 600; color: var(--ink);
  margin-bottom: 6px; letter-spacing: 0.005em;
}
.field label a {
  font-size: 12.5px; color: var(--blue);
  text-decoration: none; font-weight: 600;
}
.field label a:hover { text-decoration: underline; }
.input-wrap { position: relative; }
.input-wrap .icon-left {
  position: absolute; left: 14px; top: 50%;
  transform: translateY(-50%); width: 16px; height: 16px;
  color: var(--muted); pointer-events: none;
}
.input-wrap input {
  width: 100%; border: 1.5px solid var(--line);
  border-radius: 10px; padding: 13px 14px 13px 42px;
  font-family: inherit; font-size: 15px; color: var(--ink);
  background: var(--paper-2); outline: none;
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}
.input-wrap input::placeholder { color: #98a6b8; }
.input-wrap input:focus {
  border-color: var(--blue); background: #fff;
  box-shadow: 0 0 0 4px rgba(10,111,192,0.12);
}
.input-wrap .reveal {
  position: absolute; right: 8px; top: 50%;
  transform: translateY(-50%); border: none; background: transparent;
  color: var(--muted); cursor: pointer; padding: 8px; border-radius: 8px;
  display: grid; place-items: center;
}
.input-wrap .reveal:hover { background: var(--paper); color: var(--ink); }
.row-between {
  display: flex; justify-content: space-between;
  align-items: center; margin: 4px 0 20px;
}
.check {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13.5px; color: var(--ink-2);
  cursor: pointer; user-select: none;
}
.check input { position: absolute; opacity: 0; pointer-events: none; }
.check .box {
  width: 18px; height: 18px;
  border: 1.5px solid var(--line); border-radius: 5px;
  background: #fff; display: grid; place-items: center;
  transition: all .15s ease;
}
.check input:checked + .box { background: var(--blue); border-color: var(--blue); }
.check .box svg {
  color: #fff; opacity: 0; transition: opacity .15s ease;
}
.check input:checked + .box svg { opacity: 1; }
.submit-btn {
  width: 100%; background: var(--blue); color: #fff;
  border: none; border-radius: 10px; padding: 14px 18px;
  font-family: inherit; font-weight: 700; font-size: 15px;
  cursor: pointer; display: inline-flex; align-items: center;
  justify-content: center; gap: 8px;
  box-shadow: 0 4px 14px rgba(10,111,192,0.28);
  transition: all .15s ease;
}
.submit-btn:hover { background: var(--blue-700); box-shadow: 0 6px 18px rgba(10,111,192,0.38); transform: translateY(-1px); }
.submit-btn:active { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.7; cursor: progress; }
.submit-btn .spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff; border-radius: 50%;
  animation: lspin .7s linear infinite;
}
@keyframes lspin { to { transform: rotate(360deg); } }
.error-msg {
  background: #fdecec; border: 1px solid #f5c0c0;
  color: var(--danger); border-radius: 8px; padding: 10px 12px;
  font-size: 13.5px; margin-bottom: 16px;
  display: flex; align-items: flex-start; gap: 8px;
}
.divider {
  display: flex; align-items: center; gap: 14px;
  margin: 24px 0; color: var(--muted);
  font-size: 12px; letter-spacing: 0.05em;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px; background: var(--line);
}
.help-note { text-align: center; font-size: 13.5px; color: var(--ink-2); line-height: 1.6; }
.help-note a { color: var(--blue); font-weight: 600; text-decoration: none; }
.help-note a:hover { text-decoration: underline; }
.form-bottom {
  text-align: center; font-size: 12px; color: var(--muted);
}

@media (max-width: 900px) {
  .login-grid { grid-template-columns: 1fr; }
  .brand-panel { padding: 28px 28px 36px; min-height: 280px; }
  .brand-panel .corner { width: 260px; height: 200px; }
  .brand-headline h1 { font-size: 28px; }
  .brand-features .features { display: none; }
  .form-panel { padding: 28px 24px 32px; }
  .form-main { max-width: 100%; }
}`;

// ─── i18n ──────────────────────────────────────────────────────────────────

const T = {
  id: {
    langLabel: "Bahasa",
    brandEyebrow: "Halal Audit Reporting System · v1.0",
    brandHeadline: "Selamat datang kembali, auditor.",
    brandSub: "Masuk untuk membuka workspace audit halal Anda — semua registrasi, dokumen, dan laporan ada di sini.",
    feat1Title: "Workspace audit",
    feat1Desc: "— daftar registrasi, jadwal, dan tim auditor di satu tempat.",
    feat2Title: "AI assisted",
    feat2Desc: "— bantu menyusun dokumen pre-audit dan mencatat temuan.",
    feat3Title: "OCR halal ID",
    feat3Desc: "— foto kemasan, sistem ekstrak ID, BPJPH isi nama produk.",
    noAccount: "Belum punya akun?",
    contactAdmin: "Hubungi admin LPH",
    formTitle: "Masuk ke HARS",
    formSub: "Gunakan akun Auditor atau Admin LPH Anda untuk melanjutkan ke workspace.",
    usernameLabel: "Username",
    usernamePlaceholder: "Masukkan username",
    passwordLabel: "Password",
    passwordPlaceholder: "Masukkan password",
    rememberMe: "Ingat saya di perangkat ini",
    loginBtn: "Masuk",
    loggingIn: "Memverifikasi...",
    orDivider: "ATAU",
    helpNote: "Demo preview — klik Masuk untuk melanjutkan.",
    footerText: "Akses internal LPH UIN Syarif Hidayatullah Jakarta · halalaudit.id",
    fillError: "Mohon isi username dan password.",
  },
  en: {
    langLabel: "Language",
    brandEyebrow: "Halal Audit Reporting System · v1.0",
    brandHeadline: "Welcome back, auditor.",
    brandSub: "Sign in to open your halal audit workspace — all registrations, documents, and reports in one place.",
    feat1Title: "Audit workspace",
    feat1Desc: "— registrations, schedules, and audit teams in one place.",
    feat2Title: "AI assisted",
    feat2Desc: "— helps draft pre-audit documents and record findings.",
    feat3Title: "Halal ID OCR",
    feat3Desc: "— photograph packaging, extract ID, BPJPH auto-fills product name.",
    noAccount: "Don't have an account?",
    contactAdmin: "Contact LPH admin",
    formTitle: "Sign in to HARS",
    formSub: "Use your Auditor or Admin LPH account to continue to the workspace.",
    usernameLabel: "Username",
    usernamePlaceholder: "Enter username",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    rememberMe: "Remember me on this device",
    loginBtn: "Sign In",
    loggingIn: "Verifying...",
    orDivider: "OR",
    helpNote: "Demo preview — click Sign In to continue.",
    footerText: "LPH UIN Syarif Hidayatullah Jakarta internal access · halalaudit.id",
    fillError: "Please fill in username and password.",
  },
  zh: {
    langLabel: "语言",
    brandEyebrow: "清真审核报告系统 · v1.0",
    brandHeadline: "欢迎回来，审核员。",
    brandSub: "登录以打开您的清真审核工作区 — 所有注册、文件和报告都在这里。",
    feat1Title: "审核工作区",
    feat1Desc: "— 注册、日程和审核团队集中管理。",
    feat2Title: "AI 辅助",
    feat2Desc: "— 帮助起草预审文件并记录发现。",
    feat3Title: "清真 ID OCR",
    feat3Desc: "— 拍摄包装，提取 ID，BPJPH 自动填写产品名称。",
    noAccount: "还没有账户？",
    contactAdmin: "联系 LPH 管理员",
    formTitle: "登录 HARS",
    formSub: "使用您的审核员或管理员账户继续访问工作区。",
    usernameLabel: "用户名",
    usernamePlaceholder: "输入用户名",
    passwordLabel: "密码",
    passwordPlaceholder: "输入密码",
    rememberMe: "在此设备上记住我",
    loginBtn: "登录",
    loggingIn: "验证中...",
    orDivider: "或",
    helpNote: "演示预览 — 点击登录继续。",
    footerText: "LPH UIN Syarif Hidayatullah Jakarta 内部访问 · halalaudit.id",
    fillError: "请填写用户名和密码。",
  },
};

// ─── Component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("demo123");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("id");

  const t = T[lang];
  const nextLang = { id: "en", en: "zh", zh: "id" };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError(t.fillError);
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
    }
  };

  return (
    <div className="login-page">
      <style>{STYLES}</style>
      <div className="login-grid">
        {/* ═══ LEFT — brand panel ═══ */}
        <aside className="brand-panel">
          <div className="corner" aria-hidden="true">
            <svg viewBox="0 0 440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="440,0 440,320 80,0" fill="#ffffff" opacity="0.06"/>
              <polygon points="440,0 440,320 180,0" fill="#ffffff" opacity="0.1"/>
              <polygon points="440,70 440,320 260,320 440,70" fill="#ffffff" opacity="0.07"/>
              <polygon points="440,150 440,320 340,320" fill="#ffffff" opacity="0.14"/>
            </svg>
          </div>

          <div className="brand-main">
          {/* Logo + name */}
          <a href="https://halalaudit.id" style={{textDecoration:"none",color:"inherit"}}>
          <div className="brand-row">
            <div className="logo">
              <img src="/uin-logo.png" alt="UIN Syarif Hidayatullah Jakarta"/>
            </div>
            <div className="name">
              <b>HARS</b>
              <span>LPH UIN Syarif Hidayatullah Jakarta</span>
            </div>
          </div>
          </a>

          {/* Eyebrow badge */}
          <div className="eyebrow">
            <span className="dot"></span>
            {t.brandEyebrow}
          </div>

          <div className="brand-headline">
            <h1>{t.brandHeadline}</h1>
            <p>{t.brandSub}</p>
          </div>

          {/* Features */}
          <div className="brand-features">
            <div className="features">
              <div className="item">
                <div className="ico"><ShieldIcon/></div>
                <div><b>{t.feat1Title}</b> {t.feat1Desc}</div>
              </div>
              <div className="item">
                <div className="ico"><SparkIcon/></div>
                <div><b>{t.feat2Title}</b> {t.feat2Desc}</div>
              </div>
              <div className="item">
                <div className="ico"><CameraIcon/></div>
                <div><b>{t.feat3Title}</b> {t.feat3Desc}</div>
              </div>
            </div>
          </div>

          </div>

          {/* Footer */}
          <div className="brand-foot">
            <span>© 2026 LPH UIN Syarif Hidayatullah Jakarta</span>
          </div>
        </aside>

        {/* ═══ RIGHT — form panel ═══ */}
        <main className="form-panel">
          {/* Top link */}
          <div className="form-top">
            {t.noAccount}{" "}
            {t.contactAdmin}
            <button onClick={() => setLang(nextLang[lang])} style={{
              marginLeft: 12, background: "none", border: "1px solid var(--line)",
              borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer",
              color: "var(--muted)", fontFamily: "inherit",
            }} title={`Switch to ${nextLang[lang].toUpperCase()}`}>
              {t.langLabel}: {lang.toUpperCase()} → {nextLang[lang].toUpperCase()}
            </button>
          </div>

          <div className="form-main">
          <div className="form-headline">
            <h2 className="title">{t.formTitle}</h2>
            <p className="subtitle">{t.formSub}</p>
          </div>

          {/* Form content */}
          <div className="form-card-wrap">
            {error && (
              <div className="error-msg" role="alert">
                <AlertIcon/>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="u">{t.usernameLabel}</label>
                <div className="input-wrap">
                  <span className="icon-left"><UserIcon/></span>
                  <input
                    id="u" type="text" autoComplete="username"
                    placeholder={t.usernamePlaceholder}
                    value={username} onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="p">
                  {t.passwordLabel}
                </label>
                <div className="input-wrap">
                  <span className="icon-left"><LockIcon/></span>
                  <input
                    id="p" type={show ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder={t.passwordPlaceholder}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="reveal"
                    onClick={() => setShow(s => !s)}
                    aria-label={show ? (lang === "en" ? "Hide password" : lang === "zh" ? "隐藏密码" : "Sembunyikan password") : (lang === "en" ? "Show password" : lang === "zh" ? "显示密码" : "Tampilkan password")}
                  >
                    <EyeIcon open={show}/>
                  </button>
                </div>
              </div>

              <div className="row-between">
                <label className="check">
                  <input type="checkbox" checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="box"><CheckIcon/></span>
                  {t.rememberMe}
                </label>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {t.loggingIn}
                  </>
                ) : (
                  <>
                    {t.loginBtn}
                    <ArrowRight/>
                  </>
                )}
              </button>
            </form>

            <div className="divider">{t.orDivider}</div>

            <div className="help-note">
              {t.helpNote}
            </div>
          </div>

          </div>

          {/* Footer */}
          <div className="form-bottom">
            {t.footerText}
          </div>
        </main>
      </div>
    </div>
  );
}
