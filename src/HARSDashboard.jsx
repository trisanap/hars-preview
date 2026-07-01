import { useState, useRef, useEffect } from "react";
import { useLang } from "./i18n";
import HARSReportEditor from "./HARSReportEditor";
import SuratTugasAuditor from "../template/SuratTugas";
import SPKDocument from "../template/SPK_LPH";
import BerkasAudit from "../template/BerkasAudit";
import TabDokumentasi from "./HARSDokumentasi";
import SettingsModal from "./SettingsModal";
import UserManagement from "./UserManagement";
import { api } from "./api";

// ─── Constants ────────────────────────────────────────────────────────────────
let AUDITORS = [];

const JENIS_PRODUK_OPTIONS = [
  "Penyediaan makanan dan minuman dengan pengolahan",
  "Daging dan produk olahan daging",
  "Produk Bakeri",
  "Kemasan produk",
  "Lemak, minyak, dan emulsi minyak",
  "Gula dan pemanis termasuk madu",
  "Serealia dan produk serealia",
  "Minuman dengan pengolahan",
  "Pangan siap saji",
  "Ikan dan produk perikanan",
  "Jasa pengolahan",
  "Barang gunaan",
  "Telur olahan dan produk-produk telur hasil olahan",
];

// ─── Design tokens (synced with welcome page) ──────────────────────────────
const C = {
  blue: "#0a6fc0",
  blueMid: "#075aa0",
  blueLight: "#cfe5f5",
  blueUltraLight: "#eaf3fb",
  gold: "#b8860b",
  goldLight: "#fdf8e8",
  red: "#c0392b",
  redLight: "#fce4ec",
  green: "#1b5e20",
  greenLight: "#e8f5e9",
  text: "#14202b",
  muted: "#7588a0",
  faint: "#9aabbf",
  border: "#d9e2ec",
  borderLight: "#ecf1f6",
  bg: "#fff",
  bgAlt: "#f6f8fb",
  bgPage: "#fafbfd",
  bgCard: "#ffffff",
  blueSoft: "#eaf3fb",
  emerald: "#0f7a4a",
};

const font = "'Plus Jakarta Sans', sans-serif";
const mono = "'JetBrains Mono', monospace";

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function auditorName(id) {
  const a = AUDITORS.find(x => x.id === id);
  return a ? a.nama : "—";
}

function Badge({ color = "blue", children }) {
  const colors = {
    blue: { bg: C.blueLight, text: C.blue },
    gold: { bg: C.goldLight, text: C.gold },
    green: { bg: C.greenLight, text: C.green },
    red: { bg: C.redLight, text: C.red },
    gray: { bg: "#f0f0ee", text: C.muted },
  };
  const s = colors[color];
  return (
    <span style={{
      background: s.bg, color: s.text,
      fontSize: 10, fontWeight: 600, padding: "2px 7px",
      borderRadius: 3, display: "inline-block", whiteSpace: "nowrap",
      letterSpacing: "0.03em",
    }}>{children}</span>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div style={{
      border: `1px solid ${C.borderLight}`, borderRadius: 6,
      overflow: "hidden", marginBottom: 16,
    }}>
      <div style={{
        padding: "10px 16px", background: C.bgAlt,
        borderBottom: `1px solid ${C.borderLight}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, value }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "180px 12px 1fr",
      padding: "5px 0", fontSize: 13, borderBottom: `1px solid ${C.borderLight}`,
    }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: C.muted }}>:</span>
      <span style={{ fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

function Btn({ onClick, variant = "primary", children, disabled, small }) {
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
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov && !disabled ? (variant === "primary" ? C.blueMid : variant === "danger" ? "#a93226" : "rgba(0,0,0,0.04)") : v.bg,
        color: v.color, border: `1px solid ${v.border}`,
        borderRadius: 5, padding: small ? "4px 10px" : "6px 14px",
        fontSize: small ? 11 : 12, fontWeight: 600, fontFamily: font,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        display: "inline-flex", alignItems: "center", gap: 5,
        whiteSpace: "nowrap",
      }}
    >{children}</button>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({ reg, onConfirm, onClose }) {
  const { t } = useLang();
  const [typed, setTyped] = useState("");
  const regName = (reg && reg.namaPU) || "";
  const match = typed.trim().toLowerCase() === regName.trim().toLowerCase();
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.bg, borderRadius: 8, width: "100%", maxWidth: 440,
        boxShadow: "0 12px 40px rgba(0,0,0,0.2)", border: `1px solid ${C.border}`,
        fontFamily: font, overflow: "hidden",
      }}>
        <div style={{ background: C.red, color: "#fff", padding: "12px 18px", fontWeight: 600, fontSize: 13 }}>
          ⚠ {t("delRegTitle")}
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: C.text, marginBottom: 14, lineHeight: 1.6 }}>
            Tindakan ini <strong>tidak dapat dibatalkan</strong>. Semua data workspace untuk{" "}
            <strong>{regName}</strong> ({reg?.id}) akan dihapus permanen.
          </p>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            {t("typeNameToConfirm")}
          </p>
          <code style={{
            display: "block", background: C.bgAlt, border: `1px solid ${C.border}`,
            borderRadius: 4, padding: "6px 10px", fontSize: 12,
            fontFamily: mono, marginBottom: 10, color: C.text,
          }}>{regName}</code>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder="Ketik nama di atas..."
            autoFocus
            style={{
              width: "100%", border: `1px solid ${match ? C.green : C.border}`,
              borderRadius: 4, padding: "7px 10px", fontSize: 13,
              fontFamily: font, outline: "none", marginBottom: 16,
              background: match ? C.greenLight : C.bg,
              transition: "all 0.2s",
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
            <Btn variant="danger" onClick={onConfirm} disabled={!match}>
              Hapus Permanen
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Registration Modal ───────────────────────────────────────────────────
function NewRegModal({ onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    id: "", namaPU: "", namaUsaha: "", jenisProduk: "", tanggalDaftar: "",
    tanggalAudit: "", leadAuditor: "", auditor: "", auditor2: "", auditor3: "", observer: "",
    alamat: "", agamaPemilik: "Islam", jenisPendaftaran: "Pengajuan Baru",
    namaPabrik: "", alamatPabrik: "", fasilitasKota: "", fasilitasNegara: "Indonesia",
    penyeliaHalal: "", penyeliaNoKTP: "", penyeliaNoSertifikat: "", penyeliaNoSK: "", penyeliaNoKontak: "",
  });
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const inp = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 4,
    padding: "7px 10px", fontSize: 13, fontFamily: font, outline: "none",
    color: C.text, background: C.bg, boxSizing: "border-box",
  };
  const [extraAud, setExtraAud] = useState(0);
  const valid = form.id.trim() && form.namaPU.trim() && form.jenisProduk && form.leadAuditor;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.bg, borderRadius: 8, width: "100%", maxWidth: 560,
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)", border: `1px solid ${C.border}`,
        fontFamily: font, maxHeight: "90vh", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          background: C.blue, color: "#fff", padding: "12px 20px",
          fontWeight: 600, fontSize: 13, flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>+ {t("newRegistration")}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                {t("certIdLabel")}
              </label>
              <input value={form.id} onChange={f("id")} style={inp}
                placeholder="SH2026-1-xxxxxxx" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                {t("registrationDate")}
              </label>
              <input type="date" value={form.tanggalDaftar} onChange={f("tanggalDaftar")} style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
              {t("ownerNameLabel")}
            </label>
            <input value={form.namaPU} onChange={f("namaPU")} style={inp}
              placeholder={t("companyNamePlaceholder")} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
              {t("businessNameLabel")}
            </label>
            <input value={form.namaUsaha} onChange={f("namaUsaha")} style={inp}
              placeholder={t("businessNamePlaceholder2")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                {t("productTypeLabel")}
              </label>
              <select value={form.jenisProduk} onChange={f("jenisProduk")} style={inp}>
                <option value="">-</option>
                {JENIS_PRODUK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                {t("registrationTypeLabel")}
              </label>
              <select value={form.jenisPendaftaran} onChange={f("jenisPendaftaran")} style={inp}>
                <option>{t("newSubmission")}</option>
                <option>{t("expansion")}</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
              {t("productionAddressLabel")}
            </label>
            <input value={form.alamat} onChange={f("alamat")} style={inp} placeholder={t("productionAddressPlaceholder")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                {t("ownerReligion")}
              </label>
              <select value={form.agamaPemilik || ""} onChange={f("agamaPemilik")} style={inp}>
                {AGAMA_OPTIONS.map(o => <option key={o} value={o}>{AGAMA_LABELS[o] || o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                {t("auditDateLabel")}
              </label>
              <input type="date" value={form.tanggalAudit} onChange={f("tanggalAudit")} style={inp} />
            </div>
          </div>

          <div style={{
            background: C.bgAlt, border: `1px solid ${C.borderLight}`,
            borderRadius: 5, padding: "12px 14px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10, letterSpacing: "0.05em" }}>
              {t("productionFacility")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("factoryName")}</label>
                <input value={form.namaPabrik} onChange={f("namaPabrik")} style={inp} placeholder={t("factoryNamePlaceholder2")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("city")}</label>
                <input value={form.fasilitasKota} onChange={f("fasilitasKota")} style={inp} placeholder="Kota" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("factoryAddress")}</label>
                <input value={form.alamatPabrik} onChange={f("alamatPabrik")} style={inp} placeholder={t("factoryAddressPlaceholder")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("country")}</label>
                <input value={form.fasilitasNegara} onChange={f("fasilitasNegara")} style={inp} />
              </div>
            </div>
          </div>

          <div style={{
            background: C.bgAlt, border: `1px solid ${C.borderLight}`,
            borderRadius: 5, padding: "12px 14px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10, letterSpacing: "0.05em" }}>
              {t("halalSupervisor")}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("supervisorName")}</label>
              <input value={form.penyeliaHalal} onChange={f("penyeliaHalal")} style={inp} placeholder={t("supervisorNamePlaceholder")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("idNumber")}</label>
                <input value={form.penyeliaNoKTP} onChange={f("penyeliaNoKTP")} style={inp} placeholder="NIK" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("certNumber")}</label>
                <input value={form.penyeliaNoSertifikat} onChange={f("penyeliaNoSertifikat")} style={inp} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("decreeNumber")}</label>
                <input value={form.penyeliaNoSK} onChange={f("penyeliaNoSK")} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{t("contactNumber")}</label>
                <input value={form.penyeliaNoKontak} onChange={f("penyeliaNoKontak")} style={inp} placeholder={t("phonePlaceholder")} />
              </div>
            </div>
          </div>

          <div style={{
            background: C.bgAlt, border: `1px solid ${C.borderLight}`,
            borderRadius: 5, padding: "12px 14px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10, letterSpacing: "0.05em" }}>
              {t("auditorTeam")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                  {t("leadAuditorLabel")}
                </label>
                <select value={form.leadAuditor} onChange={f("leadAuditor")} style={inp}>
                  <option value="">-</option>
                  {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                  {t("auditor")}
                </label>
                <select value={form.auditor} onChange={f("auditor")} style={inp}>
                  <option value="">-</option>
                  {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                {t("observerOptional")}
              </label>
              <input value={form.observer} onChange={f("observer")} style={inp}
                placeholder={t("observerPlaceholder")} />
            </div>
            {extraAud >= 1 && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                  {t("additionalAuditor1")}
                </label>
                <select value={form.auditor2 || ""} onChange={f("auditor2")} style={inp}>
                  <option value="">-</option>
                  {AUDITORS.filter(a => a.id !== parseInt(form.leadAuditor) && a.id !== parseInt(form.auditor) && a.id !== parseInt(form.auditor3)).map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
            )}
            {extraAud >= 2 && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                  {t("additionalAuditor2")}
                </label>
                <select value={form.auditor3 || ""} onChange={f("auditor3")} style={inp}>
                  <option value="">-</option>
                  {AUDITORS.filter(a => a.id !== parseInt(form.leadAuditor) && a.id !== parseInt(form.auditor) && a.id !== parseInt(form.auditor2)).map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
            )}
            {extraAud < 2 && (
              <div style={{ marginTop: 10 }}>
                <Btn variant="ghost" small onClick={() => setExtraAud(extraAud + 1)}>
                  + Tambah Auditor
                </Btn>
              </div>
            )}
          </div>
        </div>

        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${C.borderLight}`,
          display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
          background: C.bgAlt,
        }}>
          <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
          <Btn variant="primary" onClick={() => onSave({ ...form, leadAuditor: parseInt(form.leadAuditor) || null, auditor: parseInt(form.auditor) || null, auditor2: form.auditor2 ? parseInt(form.auditor2) || null : null, auditor3: form.auditor3 ? parseInt(form.auditor3) || null : null })} disabled={!valid}>
            Buat Workspace
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Doc Preview Modal ───────────────────────────────────────────────────────
function DocPreviewModal({ reg, facility, stMeta, onClose, onGenerated }) {
  const bulanRomawi = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
  const now = new Date();

  const nomor = stMeta?.nomor || "";
  const bulan = stMeta?.bulan || "";
  const tahun = stMeta?.tahun || String(now.getFullYear());
  const tglAuditVal = stMeta?.tglAudit || reg.tanggalAudit || "";
  const tglSuratVal = stMeta?.tglSurat || reg.tanggalAudit || "";

  const docRef = useRef(null);

  const fmtLong = d => d ? new Date(d).toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" }) : "__________";
  const fmtDateOnly = d => d ? new Date(d).toLocaleDateString("id-ID", { year:"numeric", month:"long", day:"numeric" }) : "__________";

  const a1 = AUDITORS.find(x => x.id === reg.leadAuditor);
  const a2 = AUDITORS.find(x => x.id === reg.auditor);
  const a2_2 = AUDITORS.find(x => x.id === reg.auditor2);
  const a2_3 = AUDITORS.find(x => x.id === reg.auditor3);

  const fas = facility || {};
  const facilityAlamat = fas.alamat || reg.alamatPabrik || reg.alamat || "";
  const facilityKota = fas.kota || reg.fasilitasKota || "";
  const facilityNegara = fas.negara || reg.fasilitasNegara || "Indonesia";
  const fullAlamat = facilityAlamat + (facilityKota ? `, ${facilityKota}` : "") + (facilityNegara && facilityNegara !== "Indonesia" ? `, ${facilityNegara}` : "");

  const docData = {
    nomor,
    bulan,
    tahun,
    tanggalSurat: tglSuratVal ? fmtDateOnly(tglSuratVal) : "__________",
    auditors: [
      { nama: a1 ? a1.nama : "__________", jabatan: "Lead Auditor" },
      ...(reg.auditor && a2 ? [{ nama: a2.nama, jabatan: "Auditor" }] : []),
      ...(reg.auditor2 && a2_2 ? [{ nama: a2_2.nama, jabatan: "Auditor" }] : []),
      ...(reg.auditor3 && a2_3 ? [{ nama: a2_3.nama, jabatan: "Auditor" }] : []),
      ...(reg.observer ? [{ nama: reg.observer, jabatan: "Observer" }] : []),
    ],
    namaPerusahaan: reg.namaPU,
    namaPabrik: fas.nama || reg.namaPabrik || reg.namaUsaha || reg.namaPU,
    alamatPabrik: fullAlamat,
    kelompokProduk: reg.jenisProduk,
    noRegistrasi: reg.id,
    tanggalAudit: tglAuditVal ? fmtLong(tglAuditVal) : "__________",
  };

  const handlePrint = () => {
    const el = docRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Surat Tugas - ${reg.namaPU}</title>
<style>@page{margin:12mm 15mm}body{font-family:Arial,sans-serif;font-size:10.5pt;margin:0;padding:0;background:#fff}</style>
</head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
    onGenerated?.();
  };

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#fff",borderRadius:8,width:"100%",maxWidth:900,
        maxHeight:"90vh",display:"flex",flexDirection:"column",
        boxShadow:"0 12px 40px rgba(0,0,0,0.2)",fontFamily:font,overflow:"hidden",
      }}>
        {/* Toolbar */}
        <div style={{
          background:C.blue,color:"#fff",padding:"10px 18px",
          display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
        }}>
          <span style={{fontWeight:600,fontSize:13}}>📋 Preview Surat Tugas</span>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={handlePrint} style={{
              background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",
              color:"#fff",borderRadius:4,padding:"4px 12px",fontSize:12,fontWeight:600,
              cursor:"pointer",fontFamily:font,
            }}>🖨 Cetak</button>
            <button onClick={onClose} style={{
              background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18,lineHeight:1,
            }}>×</button>
          </div>
        </div>
        {/* Document preview */}
        <div style={{flex:1,overflow:"auto",background:"#d0d0d0"}}>
          <div ref={docRef} style={{maxWidth:794,margin:"24px auto"}}>
            <SuratTugasAuditor data={docData} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SPK Preview Modal ───────────────────────────────────────────────────────
function SPKPreviewModal({ reg, onClose, onGenerated }) {
  const docRef = useRef(null);
  const a1 = AUDITORS.find(x => x.id === reg.leadAuditor);
  const [nomor, setNomor] = useState("");
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");
  const [tglAuditVal, setTglAuditVal] = useState("");
  const [tempat, setTempat] = useState("Tangerang Selatan");

  useEffect(() => {
    (async () => {
      const saved = await api.getState("spk_meta_" + reg.id).then(r => r.value);
      const now = new Date();
      if (saved) {
        setNomor(saved.nomor || "");
        setBulan(saved.bulan || "");
        setTahun(saved.tahun || String(now.getFullYear()));
        setTglAuditVal(saved.tglAudit || reg.tanggalAudit || "");
        setTempat(saved.tempat || "Tangerang Selatan");
      } else {
        setNomor("");
        setBulan("");
        setTahun(String(now.getFullYear()));
        setTglAuditVal(reg.tanggalAudit || "");
        setTempat("Tangerang Selatan");
      }
    })();
  }, [reg.id]);

  const fmtHari = d => d ? new Date(d).toLocaleDateString("id-ID", { weekday:"long" }) : null;
  const fmtTgl = d => d ? new Date(d).toLocaleDateString("id-ID", { year:"numeric", month:"long", day:"numeric" }) : null;

  const spkData = {
    nomor: nomor || null,
    bulan: bulan || null,
    hari: tglAuditVal ? fmtHari(tglAuditVal) : null,
    tanggal: tglAuditVal ? fmtTgl(tglAuditVal) : null,
    tempat: tempat || null,
    auditor: a1 ? a1.nama : null,
    namaPU: reg.namaPU || null,
    alamatPU: reg.alamat || null,
  };

  const handlePrint = () => {
    const el = docRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const styles = Array.from(document.styleSheets)
      .map(s => { try { return Array.from(s.cssRules || []).map(r => r.cssText).join(""); } catch(e) { return ""; }})
      .join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SPK - ${reg.namaPU}</title><style>${styles}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
    onGenerated?.();
  };

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#fff",borderRadius:8,width:"100%",maxWidth:900,
        maxHeight:"90vh",display:"flex",flexDirection:"column",
        boxShadow:"0 12px 40px rgba(0,0,0,0.2)",fontFamily:font,overflow:"hidden",
      }}>
        <div style={{
          background:C.blue,color:"#fff",padding:"10px 18px",
          display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
        }}>
          <span style={{fontWeight:600,fontSize:13}}>🤝 Preview SPK</span>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={handlePrint} style={{
              background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",
              color:"#fff",borderRadius:4,padding:"4px 12px",fontSize:12,fontWeight:600,
              cursor:"pointer",fontFamily:font,
            }}>🖨 Cetak</button>
            <button onClick={onClose} style={{
              background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18,lineHeight:1,
            }}>×</button>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",background:"#d0d0d0"}}>
          <div ref={docRef} style={{maxWidth:794,margin:"24px auto"}}>
            <SPKDocument data={spkData} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Berkas Preview Modal ────────────────────────────────────────────────────
function BerkasPreviewModal({ reg, onClose, onGenerated }) {
  const docRef = useRef(null);
  const a1 = AUDITORS.find(x => x.id === reg.leadAuditor);
  const a2 = AUDITORS.find(x => x.id === reg.auditor);
  const a3 = AUDITORS.find(x => x.id === reg.auditor2);
  const a4 = AUDITORS.find(x => x.id === reg.auditor3);
  const [hariTanggal, setHariTanggal] = useState(reg.tanggalAudit || "");
  const fmtLong = d => d ? new Date(d).toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" }) : "__________";

  useEffect(() => {
    (async () => {
      const saved = await api.getState("berkas_meta_" + reg.id).then(r => r.value);
      if (saved?.hariTanggal) setHariTanggal(saved.hariTanggal);
    })();
  }, [reg.id]);

  const berkasData = {
    namaPerusahaan: reg.namaPU || null,
    hariTanggal: fmtLong(hariTanggal),
    noDaftar: reg.id || null,
    auditor1: a1 ? a1.nama : null,
    auditor2: a2 ? a2.nama : null,
    auditor3: a3 ? a3.nama : null,
    auditor4: a4 ? a4.nama : null,
  };

  const handlePrint = () => {
    const el = docRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const styles = Array.from(document.styleSheets)
      .map(s => { try { return Array.from(s.cssRules || []).map(r => r.cssText).join(""); } catch(e) { return ""; }})
      .join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Berkas Audit - ${reg.namaPU}</title><style>${styles}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
    onGenerated?.();
  };

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#fff",borderRadius:8,width:"100%",maxWidth:900,
        maxHeight:"90vh",display:"flex",flexDirection:"column",
        boxShadow:"0 12px 40px rgba(0,0,0,0.2)",fontFamily:font,overflow:"hidden",
      }}>
        <div style={{
          background:C.blue,color:"#fff",padding:"10px 18px",
          display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
        }}>
          <span style={{fontWeight:600,fontSize:13}}>📁 Preview Berkas Audit</span>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={handlePrint} style={{
              background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",
              color:"#fff",borderRadius:4,padding:"4px 12px",fontSize:12,fontWeight:600,
              cursor:"pointer",fontFamily:font,
            }}>🖨 Cetak</button>
            <button onClick={onClose} style={{
              background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18,lineHeight:1,
            }}>×</button>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",background:"#d0d0d0",padding:"24px"}}>
          <div ref={docRef}>
            <BerkasAudit data={berkasData} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ST Edit Modal ────────────────────────────────────────────────────────────
function STEditModal({ reg, stEntry, stIndex, onClose, onSave }) {
  const bulanRomawi = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
  const now = new Date();
  const inp = {width:"100%",border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",fontSize:13,fontFamily:font,outline:"none",color:C.text,background:C.bg,boxSizing:"border-box"};
  const [nomor, setNomor] = useState(stEntry?.nomor || "");
  const [bulan, setBulan] = useState(stEntry?.bulan || bulanRomawi[now.getMonth()+1]);
  const [tahun, setTahun] = useState(stEntry?.tahun || String(now.getFullYear()));
  const [tglAudit, setTglAudit] = useState(stEntry?.tglAudit || reg?.tanggalAudit || "");
  const [tglSurat, setTglSurat] = useState(stEntry?.tglSurat || reg?.tanggalAudit || "");
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    const updated = { ...stEntry, nomor, bulan, tahun, tglAudit, tglSurat };
    onSave(updated);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:480,boxShadow:"0 12px 40px rgba(0,0,0,0.18)",padding:24,fontFamily:font}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:18}}>Edit Surat Tugas</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>NO. SURAT</label>
            <input value={nomor} onChange={e=>setNomor(e.target.value)} style={inp} placeholder="001"/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>BULAN (ROMawi)</label>
            <input value={bulan} onChange={e=>setBulan(e.target.value.toUpperCase())} style={inp} placeholder="IV"/>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>TAHUN</label>
          <input value={tahun} onChange={e=>setTahun(e.target.value.replace(/\D/g,"").slice(0,4))} style={{...inp,maxWidth:120}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>{t("auditDateLabel")}</label>
            <input type="date" value={tglAudit} onChange={e=>setTglAudit(e.target.value)} style={inp}/>
            <div style={{fontSize:10,color:C.faint,marginTop:2}}>Akan muncul dengan nama hari</div>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>TANGGAL SURAT</label>
            <input type="date" value={tglSurat} onChange={e=>setTglSurat(e.target.value)} style={inp}/>
            <div style={{fontSize:10,color:C.faint,marginTop:2}}>Format: DD Bulan Tahun</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 16px",fontSize:12,cursor:"pointer",fontFamily:font}}>{t("cancel")}</button>
          <button onClick={save} disabled={saving} style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font,opacity:saving?0.6:1}}>
            {saving?"Menyimpan…":"Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SPK Edit Modal ───────────────────────────────────────────────────────────
function SPKEditModal({ reg, onClose }) {
  const bulanRomawi = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
  const now = new Date();
  const inp = {width:"100%",border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",fontSize:13,fontFamily:font,outline:"none",color:C.text,background:C.bg,boxSizing:"border-box"};
  const [nomor, setNomor] = useState("");
  const [bulan, setBulan] = useState(bulanRomawi[now.getMonth()+1]);
  const [tahun, setTahun] = useState(String(now.getFullYear()));
  const [tglAudit, setTglAudit] = useState(reg?.tanggalAudit || "");
  const [tempat, setTempat] = useState("Tangerang Selatan");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await api.getState("spk_meta_" + reg.id).then(r => r.value);
      if (saved) {
        if (saved.nomor) setNomor(saved.nomor);
        if (saved.bulan) setBulan(saved.bulan);
        if (saved.tahun) setTahun(saved.tahun);
        if (saved.tglAudit) setTglAudit(saved.tglAudit);
        if (saved.tempat) setTempat(saved.tempat);
      }
    })();
  }, [reg.id]);

  const save = async () => {
    setSaving(true);
    await api.setState("spk_meta_" + reg.id, { nomor, bulan, tahun, tglAudit, tempat });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:480,boxShadow:"0 12px 40px rgba(0,0,0,0.18)",padding:24,fontFamily:font}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:18}}>Edit SPK</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>NO. SURAT</label>
            <input value={nomor} onChange={e=>setNomor(e.target.value)} style={inp} placeholder="001"/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>BULAN (ROMawi)</label>
            <input value={bulan} onChange={e=>setBulan(e.target.value.toUpperCase())} style={inp} placeholder="IV"/>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>TAHUN</label>
          <input value={tahun} onChange={e=>setTahun(e.target.value.replace(/\D/g,"").slice(0,4))} style={{...inp,maxWidth:120}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>{t("auditDateLabel")}</label>
            <input type="date" value={tglAudit} onChange={e=>setTglAudit(e.target.value)} style={inp}/>
            <div style={{fontSize:10,color:C.faint,marginTop:2}}>Akan muncul dengan nama hari</div>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>TEMPAT</label>
            <input value={tempat} onChange={e=>setTempat(e.target.value)} style={inp}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 16px",fontSize:12,cursor:"pointer",fontFamily:font}}>{t("cancel")}</button>
          <button onClick={save} disabled={saving} style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font,opacity:saving?0.6:1}}>
            {saving?"Menyimpan…":"Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Berkas Edit Modal ───────────────────────────────────────────────────────
function BerkasEditModal({ reg, onClose }) {
  const inp = {width:"100%",border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 10px",fontSize:13,fontFamily:font,outline:"none",color:C.text,background:C.bg,boxSizing:"border-box"};
  const [hariTanggal, setHariTanggal] = useState(reg?.tanggalAudit || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await api.getState("berkas_meta_" + reg.id).then(r => r.value);
      if (saved?.hariTanggal) setHariTanggal(saved.hariTanggal);
    })();
  }, [reg.id]);

  const save = async () => {
    setSaving(true);
    await api.setState("berkas_meta_" + reg.id, { hariTanggal });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:420,boxShadow:"0 12px 40px rgba(0,0,0,0.18)",padding:24,fontFamily:font}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:18}}>Edit Berkas Audit</div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4}}>{t("auditDateLabel")}</label>
          <input type="date" value={hariTanggal} onChange={e=>setHariTanggal(e.target.value)} style={inp}/>
          <div style={{fontSize:10,color:C.faint,marginTop:2}}>Akan muncul dengan nama hari di dokumen</div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 16px",fontSize:12,cursor:"pointer",fontFamily:font}}>{t("cancel")}</button>
          <button onClick={save} disabled={saving} style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font,opacity:saving?0.6:1}}>
            {saving?"Menyimpan…":"Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Data Pengajuan ──────────────────────────────────────────────────────
// ─── Sidebar for Data Pengajuan tab ──────────────────────────────────────────
function DataSidebar({ reg, tlVersion }) {
  const { t } = useLang();
  const now = new Date();
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const fmtMon = iso => { if(!iso)return""; const d=new Date(iso+"T00:00:00"); return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`; };
  const todayStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  // Load timeline state
  const [tlData, setTlData] = useState({});
  useEffect(() => {
    (async () => {
      const saved = await api.getState("tl_"+reg.id).then(r => r.value);
      if (saved) { try { setTlData(JSON.parse(saved)); } catch {} }
    })();
  }, [reg.id, tlVersion]);

  const preAuditDone = tlData.preAuditChecked || false;
  const auditSigned = tlData.auditSigned || false;

  // Status state (fatwa only — pre-audit moved to Dokumen Pre-Audit tab)
  const [fatwaBody, setFatwaBody] = useState(tlData.fatwaBody || "");
  const [fatwaDate, setFatwaDate] = useState(tlData.fatwaDate || "");

  const saveTimeline = async (updates) => {
    const data = { ...tlData, fatwaBody, fatwaDate, ...updates };
    if (data.fatwaBody !== undefined) setFatwaBody(data.fatwaBody);
    if (data.fatwaDate !== undefined) setFatwaDate(data.fatwaDate);
    setTlData(data);
    await api.setState("tl_"+reg.id, JSON.stringify(data));
    // Update registration status to match timeline
    if (updates.perbaikanDate !== undefined) {
      try { await api.updateRegistration(reg.id, { status: updates.perbaikanDate ? "perbaikan" : "field" }); } catch {}
    }
  };

  // Timeline steps (after all state declarations)
  const hasPerbaikan = !!tlData.perbaikanDate;
  const tlLabels = t("timelineSteps");
  const tlSteps = [
    { key:"registered", label: tlLabels[0], date: reg.tanggalDaftar ? fmtMon(reg.tanggalDaftar) : "—" },
    { key:"preaudit", label: tlLabels[1], date: tlData.preAuditDate ? fmtMon(tlData.preAuditDate) : "—" },
    { key:"field", label: tlLabels[2], date: reg.tanggalAudit ? fmtMon(reg.tanggalAudit) : "—" },
    { key:"perbaikan", label: tlLabels[3], date: tlData.perbaikanDate ? fmtMon(tlData.perbaikanDate) : "—" },
    { key:"report", label: tlLabels[4], date: "—" },
    { key:"fatwa", label: tlLabels[5], date: fatwaDate ? fmtMon(fatwaDate) : "—" },
  ];

  // Determine current step
  const currentStep = (() => {
    if (reg.status === "completed" || reg.status === "done") return "fatwa";
    if (hasPerbaikan) return "perbaikan";
    if (auditSigned) return "report";
    if (reg.tanggalAudit && new Date(reg.tanggalAudit+"T00:00:00") <= now) return "field";
    if (preAuditDone) return "preaudit";
    return "registered";
  })();

  const stepOrder = ["registered","preaudit","field","perbaikan","report","fatwa"];
  const currIdx = stepOrder.indexOf(currentStep);

  const steps = tlSteps.map((s,i) => ({
    ...s,
    done: i < currIdx,
    curr: i === currIdx,
  }));

  const progress = currIdx === 0 ? 0 : currIdx === 1 ? 17 : currIdx === 2 ? 33 : currIdx === 3 ? 50 : currIdx === 4 ? 75 : 100;
  const phaseLabel = t("phases")[currIdx];

  const icon = (name) => {
    const icons = {
      id: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
      user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>,
      person: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      cal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    };
    return icons[name] || null;
  };

  return <div style={{ display:"flex",flexDirection:"column",gap:14,position:"sticky",top:70 }}>
    {/* Tahap Saat Ini */}
    <div style={{ background:`linear-gradient(160deg,${C.blue} 0%,${C.blueMid||C.blue} 100%)`, color:"#fff",
      borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",right:-30,top:-30,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.08)" }}></div>
      <div style={{ position:"absolute",right:-50,bottom:-50,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.05)" }}></div>
      <div style={{ fontSize:10.5,fontWeight:700,letterSpacing:"0.10em",textTransform:"uppercase",color:"rgba(255,255,255,0.78)",position:"relative",zIndex:1 }}>Tahap Saat Ini</div>
      <div style={{ fontSize:18,fontWeight:800,letterSpacing:"-0.01em",margin:"6px 0 14px",position:"relative",zIndex:1 }}>{phaseLabel}</div>
      <div style={{ height:6,borderRadius:99,background:"rgba(255,255,255,0.18)",overflow:"hidden",position:"relative",zIndex:1 }}>
        <div style={{ height:"100%",width:`${progress}%`,background:"#fff",borderRadius:99 }}></div>
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginTop:10,fontSize:12,color:"rgba(255,255,255,0.78)",position:"relative",zIndex:1 }}>
        <span>Progres</span>
        <b style={{ color:"#fff",fontWeight:700,fontFamily:mono }}>{progress}%</b>
      </div>
    </div>

    {/* Linimasa Audit */}
    <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,padding:"18px 20px 14px" }}>
      <h3 style={{ margin:"0 0 14px",fontSize:13,fontWeight:700,color:C.text }}>Linimasa Audit</h3>
      {steps.map((s,i) => (
        <div key={s.key} style={{ display:"flex",gap:12,position:"relative",paddingBottom:14 }}>
          {i < steps.length-1 && <div style={{ position:"absolute",left:5.5,top:14,bottom:0,width:1,background:C.borderLight }}></div>}
          <div style={{ width:13,height:13,borderRadius:"50%",flexShrink:0,
            background:s.done?C.emerald:s.curr?C.blue:"#fff",
            border:`2px solid ${s.done?C.emerald:s.curr?C.blue:C.borderLight}`,
            boxShadow:s.curr?`0 0 0 4px ${C.blueSoft}`:"none",
            marginTop:2,position:"relative",zIndex:1 }}></div>
          <div style={{ flex:1,fontSize:13 }}>
            <div style={{ fontWeight:600,color:s.done||s.curr?C.text:C.muted }}>{s.label}</div>
            <div style={{ fontSize:11.5,color:C.muted,fontFamily:mono,marginTop:2 }}>{s.date}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Status Update */}
    <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,padding:"16px 20px" }}>
      <h3 style={{ margin:"0 0 12px",fontSize:13,fontWeight:700,color:C.text }}>Status Update</h3>
      <div style={{ fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:C.muted,marginBottom:8 }}>Perbaikan Hasil Audit</div>
      <input type="date" value={tlData.perbaikanDate || ""} onChange={e=>saveTimeline({perbaikanDate:e.target.value})}
        style={{ width:"100%",padding:"6px 8px",fontSize:12,fontFamily:font,border:`1px solid ${C.borderLight}`,borderRadius:6,color:C.text,background:C.bg,marginBottom:14,boxSizing:"border-box" }} />
      <div style={{ borderTop:`1px solid ${C.borderLight}`,paddingTop:12 }}>
        <div style={{ fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:C.muted,marginBottom:8 }}>Sidang Fatwa</div>
        <select value={fatwaBody} onChange={e=>saveTimeline({fatwaBody:e.target.value})}
          style={{ width:"100%",padding:"6px 8px",fontSize:12,fontFamily:font,border:`1px solid ${C.borderLight}`,borderRadius:6,color:C.text,background:C.bg,marginBottom:8,boxSizing:"border-box" }}>
          <option value="">Pilih badan fatwa…</option>
          <option value="MUI">Komisi Fatwa MUI</option>
          <option value="BPJPH">Komite Fatwa BPJPH</option>
        </select>
        <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:3 }}>Tanggal Sidang</label>
        <input type="date" value={fatwaDate} onChange={e=>saveTimeline({fatwaDate:e.target.value})}
          style={{ width:"100%",padding:"6px 8px",fontSize:12,fontFamily:font,border:`1px solid ${C.borderLight}`,borderRadius:6,color:C.text,background:C.bg,boxSizing:"border-box" }} />
      </div>
    </div>
  </div>;
}

// ─── Data Pengajuan Tab ────────────────────────────────────────────────────
const AGAMA_OPTIONS = ["", "Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"];
const AGAMA_LABELS = { "": "—", "Islam": "Islam", "Kristen": "Kristen", "Katolik": "Katolik", "Hindu": "Hindu", "Buddha": "Buddha", "Konghucu": "Konghucu" };

function TabDataPengajuan({ reg, onUpdate, isAdmin, editing, setEditing }) {
  const { t } = useLang();
  const [form, setForm] = useState({ ...reg });
  const initExtraAud = (reg.auditor2 ? 1 : 0) + (reg.auditor3 ? 1 : 0);
  const [extraAud, setExtraAud] = useState(initExtraAud);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const inp = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 6,
    padding: "7px 10px", fontSize: 13, fontFamily: font, outline: "none",
    color: C.text, background: C.bg, boxSizing: "border-box",
  };

  // Facilities list — loaded from app_state, defaults from reg
  const [fasilitasList, setFasilitasList] = useState([
    { nama: "", alamat: "", kota: "", negara: "Indonesia" }
  ]);
  const [fasLoaded, setFasLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const saved = await api.getState("fasilitas_" + reg.id).then(r => r.value);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setFasilitasList(saved);
      } else {
        setFasilitasList([
          { nama: reg.namaPabrik || "", alamat: reg.alamatPabrik || "", kota: reg.fasilitasKota || "", negara: reg.fasilitasNegara || "Indonesia" }
        ]);
      }
      setFasLoaded(true);
    })();
  }, [reg.id]);
  const updateFasilitas = (i, field, value) => {
    setFasilitasList(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  };
  const addFasilitas = () => {
    setFasilitasList(prev => [...prev, { nama: "", alamat: "", kota: "", negara: "Indonesia" }]);
  };
  const removeFasilitas = (i) => {
    setFasilitasList(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    const firstFas = fasilitasList[0] || {};
    const updated = {
      ...form,
      leadAuditor: parseInt(form.leadAuditor) || null, auditor: parseInt(form.auditor) || null,
      auditor2: form.auditor2 ? parseInt(form.auditor2) || null : null,
      auditor3: form.auditor3 ? parseInt(form.auditor3) || null : null,
      namaPabrik: firstFas.nama || "", alamatPabrik: firstFas.alamat || "",
      fasilitasKota: firstFas.kota || "", fasilitasNegara: firstFas.negara || "Indonesia",
    };
    onUpdate(updated);
    await api.setState("fasilitas_" + reg.id, fasilitasList);
    setEditing(false);
  };

  // Shared card icon component
  const CardIcon = ({ children }) => <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center",flexShrink:0 }}>{children}</div>;
  const icId = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  const icUser = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>;
  const icPerson = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  const icCal = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;

  if (editing) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
          <Btn variant="ghost" onClick={() => { setForm({ ...reg }); setEditing(false); }}>{t("cancel")}</Btn>
          <Btn variant="primary" onClick={save}>{t("saveChanges")}</Btn>
        </div>

        {/* {t("registrationIdentity")} */}
        <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
          <div style={{ display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icId}</div>
              <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("registrationIdentity")}</h2>
            </div>
          </div>
          <div style={{ padding:"12px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("certIdShort")}</label>
              <input value={form.id} style={{ ...inp,background:C.bgAlt,color:C.muted }} readOnly />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("registrationDate")}</label>
              <input type="date" value={form.tanggalDaftar} onChange={f("tanggalDaftar")} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("registrationTypeLabel")}</label>
              <select value={form.jenisPendaftaran} onChange={f("jenisPendaftaran")} style={inp}>
                <option>{t("newSubmission")}</option><option>{t("expansion")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pelaku Usaha */}
        <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
          <div style={{ display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icUser}</div>
              <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("businessOwner")}</h2>
            </div>
          </div>
          <div style={{ padding:"12px 20px" }}>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("ownerNameLabel")}</label>
              <input value={form.namaPU} onChange={f("namaPU")} style={inp} />
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("businessNameLabel")}</label>
              <input value={form.namaUsaha} onChange={f("namaUsaha")} style={inp} />
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("productTypeLabel")}</label>
                <select value={form.jenisProduk} onChange={f("jenisProduk")} style={inp}>
                  {JENIS_PRODUK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("ownerReligion")}</label>
                <select value={form.agamaPemilik || ""} onChange={f("agamaPemilik")} style={inp}>
                  {AGAMA_OPTIONS.map(o => <option key={o} value={o}>{AGAMA_LABELS[o] || o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("productionAddressLabel")}</label>
              <input value={form.alamat} onChange={f("alamat")} style={inp} />
            </div>
            {/* Fasilitas Produksi */}
            {fasLoaded && fasilitasList.map((fas, i) => (
              <div key={i} style={{
                background: i % 2 === 0 ? C.bg : C.bgAlt,
                border: `1px solid ${C.borderLight}`, borderRadius: 6,
                padding: "10px 12px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em" }}>
                    FASILITAS {i + 1}
                  </span>
                  {fasilitasList.length > 1 && (
                    <button onClick={() => removeFasilitas(i)} style={{
                      background: "transparent", border: "none", color: "red", cursor: "pointer",
                      fontSize: 16, lineHeight: 1, padding: "0 2px",
                    }} title="Hapus fasilitas">🗑</button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: C.muted, display: "block", marginBottom: 2 }}>{t("factoryName")}</label>
                    <input value={fas.nama} onChange={e => updateFasilitas(i, "nama", e.target.value)} style={inp} placeholder="Nama pabrik/fasilitas" />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: C.muted, display: "block", marginBottom: 2 }}>{t("city")}</label>
                    <input value={fas.kota} onChange={e => updateFasilitas(i, "kota", e.target.value)} style={inp} placeholder="Kota" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: C.muted, display: "block", marginBottom: 2 }}>{t("factoryAddress")}</label>
                    <input value={fas.alamat} onChange={e => updateFasilitas(i, "alamat", e.target.value)} style={inp} placeholder="Alamat lengkap pabrik" />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: C.muted, display: "block", marginBottom: 2 }}>{t("country")}</label>
                    <input value={fas.negara} onChange={e => updateFasilitas(i, "negara", e.target.value)} style={inp} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addFasilitas} style={{
              background: "transparent", border: `1px dashed ${C.blue}`, borderRadius: 4,
              padding: "6px 14px", fontSize: 12, color: C.blue, cursor: "pointer",
              fontFamily: font, fontWeight: 500, width: "100%",
            }}>
              + Tambah Fasilitas
            </button>
          </div>
        </div>

        {/* Penyelia Halal */}
        <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
          <div style={{ display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icPerson}</div>
              <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("halalSupervisor")}</h2>
            </div>
          </div>
          <div style={{ padding:"12px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("name")}</label>
              <input value={form.penyeliaHalal || ""} onChange={f("penyeliaHalal")} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("idNumber")}</label>
              <input value={form.penyeliaNoKTP || ""} onChange={f("penyeliaNoKTP")} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("certNumber")}</label>
              <input value={form.penyeliaNoSertifikat || ""} onChange={f("penyeliaNoSertifikat")} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("decreeNumber")}</label>
              <input value={form.penyeliaNoSK || ""} onChange={f("penyeliaNoSK")} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("contactNumber")}</label>
              <input value={form.penyeliaNoKontak || ""} onChange={f("penyeliaNoKontak")} style={inp} />
            </div>
          </div>
        </div>

        {/* Jadwal Audit */}
        <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
          <div style={{ display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icCal}</div>
              <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("auditSchedule")}</h2>
            </div>
          </div>
          <div style={{ padding:"12px 20px" }}>
            <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("auditDateLabel")}</label>
            <input type="date" value={form.tanggalAudit} onChange={f("tanggalAudit")} style={{ ...inp, maxWidth: 260 }} />
          </div>
        </div>

        {/* Tim Auditor */}
        <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
          <div style={{ display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icPerson}</div>
              <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("auditorTeam")}</h2>
            </div>
          </div>
          <div style={{ padding:"12px 20px" }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("leadAuditor")}</label>
                <select value={form.leadAuditor || ""} onChange={f("leadAuditor")} style={inp}>
                  <option value="">-</option>
                  {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("auditor")}</label>
                <select value={form.auditor || ""} onChange={f("auditor")} style={inp}>
                  <option value="">-</option>
                  {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("observerOptional")}</label>
              <input value={form.observer || ""} onChange={f("observer")} style={{ ...inp, maxWidth: 360 }} placeholder={t("observerPlaceholder")} />
            </div>
            {extraAud >= 1 && (
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("additionalAuditor1")}</label>
                <select value={form.auditor2 || ""} onChange={f("auditor2")} style={{ ...inp, maxWidth: 360 }}>
                  <option value="">-</option>
                  {AUDITORS.filter(a => a.id !== parseInt(form.leadAuditor) && a.id !== parseInt(form.auditor) && a.id !== parseInt(form.auditor3)).map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
            )}
            {extraAud >= 2 && (
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11,fontWeight:600,color:C.muted,display:"block",marginBottom:4 }}>{t("additionalAuditor2")}</label>
                <select value={form.auditor3 || ""} onChange={f("auditor3")} style={{ ...inp, maxWidth: 360 }}>
                  <option value="">-</option>
                  {AUDITORS.filter(a => a.id !== parseInt(form.leadAuditor) && a.id !== parseInt(form.auditor) && a.id !== parseInt(form.auditor2)).map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
            )}
            {extraAud < 2 && (
              <Btn variant="ghost" small onClick={() => setExtraAud(extraAud + 1)}>+ Tambah Auditor</Btn>
            )}
          </div>
        </div>
      </div>
    );
  }

  const auditorTeam = [
    { peran: "Lead Auditor", id: reg.leadAuditor },
    { peran: "Auditor", id: reg.auditor },
    ...(reg.auditor2 ? [{ peran: "Auditor", id: reg.auditor2 }] : []),
    ...(reg.auditor3 ? [{ peran: "Auditor", id: reg.auditor3 }] : []),
  ].filter(Boolean);

  // Avatar initials
  const avInit = nama => nama ? nama.split(" ").filter(Boolean).map(s=>s[0]).slice(0,2).join("").toUpperCase() : "??";

  return (
    <div>
      {/* {t("registrationIdentity")} */}
      <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}`,background:C.bgCard }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icId}</div>
            <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("registrationIdentity")}</h2>
          </div>
        </div>
        <dl style={{ margin:0,padding:"6px 20px 14px",display:"grid",gridTemplateColumns:"200px 1fr",columnGap:24 }}>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>No. Daftar</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500,display:"flex",alignItems:"center",gap:8 }}><span style={{ fontFamily:mono,color:C.text,fontWeight:600 }}>{reg.id}</span></dd>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>Tanggal Daftar</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}><span style={{ fontWeight:600 }}>{fmtDate(reg.tanggalDaftar)}</span></dd>
          <dt style={{ padding:"11px 0",borderBottom:"none",fontSize:13.5,color:C.muted,fontWeight:500 }}>Jenis Pendaftaran</dt>
          <dd style={{ padding:"11px 0",borderBottom:"none",fontSize:13.5,color:C.text,fontWeight:500 }}><span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 9px",borderRadius:6,background:C.blueSoft,color:C.blue,fontSize:12,fontWeight:600 }}>{reg.jenisPendaftaran}</span></dd>
        </dl>
      </div>

      {/* Pelaku Usaha */}
      <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}`,background:C.bgCard }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icUser}</div>
            <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("businessOwner")}</h2>
          </div>
        </div>
        <dl style={{ margin:0,padding:"6px 20px 14px",display:"grid",gridTemplateColumns:"200px 1fr",columnGap:24 }}>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("ownerNameShort")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}><span style={{ fontWeight:600 }}>{reg.namaPU}</span></dd>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("businessNameLabel")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}>{reg.namaUsaha || "—"}</dd>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("productTypeLabel")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}><span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 9px",borderRadius:6,background:C.bgAlt,color:C.text,fontSize:12,fontWeight:600 }}>{reg.jenisProduk}</span></dd>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("productionAddressLabel")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}>
            <div style={{ background:C.bgAlt,border:`1px solid ${C.borderLight}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.text,lineHeight:1.55,flex:1 }}>
              {reg.alamat || "—"}
              {reg.fasilitasKota && <span style={{ display:"block",color:C.muted,fontSize:12.5,marginTop:2 }}>{reg.fasilitasKota}{reg.fasilitasNegara ? `, ${reg.fasilitasNegara}` : ""}</span>}
            </div>
          </dd>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("ownerReligion")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}>{reg.agamaPemilik || "—"}</dd>
          {fasLoaded && fasilitasList.length === 1 && fasilitasList[0].nama && (
            <><dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("factoryName")}</dt><dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}>{fasilitasList[0].nama}</dd></>
          )}
          {fasLoaded && fasilitasList.length === 1 && fasilitasList[0].alamat && (
            <><dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("factoryAddress")}</dt><dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}>{fasilitasList[0].alamat}</dd></>
          )}
          {fasLoaded && fasilitasList.length > 1 && (
            <>
              <dt style={{ padding:"11px 0",borderBottom:"none",fontSize:13.5,color:C.muted,fontWeight:500,alignSelf:"flex-start" }}>{t("productionFacility")}</dt>
              <dd style={{ padding:"11px 0",borderBottom:"none",fontSize:13.5,color:C.text,fontWeight:500 }}>
                {fasilitasList.map((f, i) => (
                  <div key={i} style={{ marginBottom: i < fasilitasList.length - 1 ? 10 : 0, padding: "8px 10px", background: i % 2 === 0 ? C.bg : C.bgAlt, borderRadius: 6, border: `1px solid ${C.borderLight}` }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{i + 1}. {f.nama || "(tanpa nama)"}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{f.alamat || "—"}{f.kota ? `, ${f.kota}` : ""}{f.negara && f.negara !== "Indonesia" ? `, ${f.negara}` : ""}</div>
                  </div>
                ))}
              </dd>
            </>
          )}
        </dl>
      </div>

      {/* Penyelia Halal */}
      <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}`,background:C.bgCard }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icPerson}</div>
            <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("halalSupervisor")}</h2>
          </div>
        </div>
        <dl style={{ margin:0,padding:"6px 20px 14px",display:"grid",gridTemplateColumns:"200px 1fr",columnGap:24 }}>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("name")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.text,fontWeight:500 }}><span style={{ fontWeight:600 }}>{reg.penyeliaHalal || "—"}</span></dd>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("idNumber")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,fontFamily:mono,color:C.text,fontWeight:500 }}>{reg.penyeliaNoKTP || "—"}</dd>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("certNumber")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,fontFamily:mono,color:C.text,fontWeight:500 }}>{reg.penyeliaNoSertifikat || "—"}</dd>
          <dt style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("decreeNumber")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:13.5,fontFamily:mono,color:C.text,fontWeight:500 }}>{reg.penyeliaNoSK || <span style={{ color:C.muted,fontStyle:"italic",fontFamily:font }}>{t("notCompleted")}</span>}</dd>
          <dt style={{ padding:"11px 0",borderBottom:"none",fontSize:13.5,color:C.muted,fontWeight:500 }}>{t("contactNumber")}</dt>
          <dd style={{ padding:"11px 0",borderBottom:"none",fontSize:13.5,fontFamily:mono,color:C.text,fontWeight:500 }}>{reg.penyeliaNoKontak || "—"}</dd>
        </dl>
      </div>

      {/* Jadwal Audit & Tim Auditor */}
      <div style={{ background:C.bgCard,border:`1px solid ${C.borderLight}`,borderRadius:12,overflow:"hidden",marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}`,background:C.bgCard }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:28,height:28,borderRadius:7,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center" }}>{icCal}</div>
            <h2 style={{ margin:0,fontSize:14,fontWeight:700,color:C.text }}>{t("scheduleAndTeam")}</h2>
          </div>
          {reg.tanggalAudit && <span style={{ fontFamily:mono,fontSize:12,fontWeight:600,color:C.blue }}>{fmtDate(reg.tanggalAudit)}</span>}
        </div>
        {reg.tanggalAudit ? (
          <div style={{ padding:"16px 20px",display:"flex",gap:14,alignItems:"center",borderBottom:`1px solid ${C.borderLight}` }}>
            <div style={{ width:64,height:64,borderRadius:10,background:C.blueSoft,color:C.blue,display:"grid",placeItems:"center",textAlign:"center",flexShrink:0 }}>
              <div>
                <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase" }}>{new Date(reg.tanggalAudit+"T00:00:00").toLocaleString("id",{month:"short"})}</div>
                <div style={{ fontFamily:mono,fontSize:22,fontWeight:700,lineHeight:1,marginTop:2 }}>{new Date(reg.tanggalAudit+"T00:00:00").getDate()}</div>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15,fontWeight:700,color:C.text }}>{fmtDate(reg.tanggalAudit)}</div>
            </div>
            <span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:99,fontSize:11.5,fontWeight:600,background:C.blueSoft,color:C.blue }}>{t("scheduled")}</span>
          </div>
        ) : (
          <div style={{ padding:"16px 20px",textAlign:"center",color:C.muted,fontSize:13,borderBottom:`1px solid ${C.borderLight}` }}>
            <Badge color="gold">{t("notScheduled")}</Badge>
          </div>
        )}
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign:"left",fontSize:10.5,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted,padding:"10px 20px",background:C.bgAlt,borderBottom:`1px solid ${C.borderLight}` }}>Peran</th>
              <th style={{ textAlign:"left",fontSize:10.5,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted,padding:"10px 20px",background:C.bgAlt,borderBottom:`1px solid ${C.borderLight}` }}>{t("name")}</th>
              <th style={{ textAlign:"right",fontSize:10.5,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted,padding:"10px 20px",background:C.bgAlt,borderBottom:`1px solid ${C.borderLight}` }}>No. Pendaftaran</th>
            </tr>
          </thead>
          <tbody>
            {auditorTeam.map((row, i) => {
              const a = AUDITORS.find(x => x.id === row.id);
              const isLead = row.peran === "Lead Auditor";
              return (
                <tr key={i}>
                  <td style={{ padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}` }}>
                    <span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 9px",borderRadius:6,fontSize:11.5,fontWeight:700,
                      background:isLead?C.blue:"#e8eae9",color:isLead?"#fff":C.text }}>{row.peran}</span>
                  </td>
                  <td style={{ padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                      <div style={{ width:32,height:32,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:11.5,fontWeight:700,
                        background:isLead?"#dceae0":"#dde6f4",color:isLead?C.emerald:"#163b6b",flexShrink:0 }}>{avInit(a?.nama)}</div>
                      <div>
                        <div style={{ fontWeight:700,color:C.text }}>{a?.nama || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}`,textAlign:"right",fontFamily:mono,fontSize:12,color:C.muted }}>{a?.reg || "—"}</td>
                </tr>
              );
            })}
            {reg.observer && (
              <tr>
                <td style={{ padding:"14px 20px" }}>
                  <span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"3px 9px",borderRadius:6,fontSize:11.5,fontWeight:700,background:"#e8eae9",color:C.text }}>Observer</span>
                </td>
                <td style={{ padding:"14px 20px" }} colSpan={2}>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:32,height:32,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:11.5,fontWeight:700,background:"#dde6f4",color:"#163b6b",flexShrink:0 }}>{avInit(reg.observer)}</div>
                    <div style={{ fontWeight:700,color:C.text }}>{reg.observer}</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Pre-Audit Docs ──────────────────────────────────────────────────────
function TabPreAudit({ reg, isAdmin, onPreAuditConfirm }) {
  const { t } = useLang();
  const [previewDoc, setPreviewDoc] = useState(null); // { type, stIndex }
  const [editDoc, setEditDoc] = useState(null);       // { type, stIndex }

  // Load facilities
  const [fasilitasList, setFasilitasList] = useState([]);
  const [fasLoaded, setFasLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const saved = await api.getState("fasilitas_" + reg.id).then(r => r.value);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setFasilitasList(saved);
      } else {
        setFasilitasList([
          { nama: reg.namaPabrik || "", alamat: reg.alamatPabrik || "", kota: reg.fasilitasKota || "", negara: reg.fasilitasNegara || "Indonesia" }
        ]);
      }
      setFasLoaded(true);
    })();
  }, [reg.id]);

  // Load ST list — one per generated ST, each picks a facility
  const [stList, setStList] = useState([]);
  const [stLoaded, setStLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const saved = await api.getState("st_list_" + reg.id).then(r => r.value);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setStList(saved);
      } else {
        // Migrate old single ST
        const old = await api.getState("st_meta_" + reg.id).then(r => r.value);
        const now = new Date();
        if (old) {
          setStList([{ id: "st0", idx: 0, nomor: old.nomor || "", bulan: old.bulan || "", tahun: old.tahun || String(now.getFullYear()), tglAudit: old.tglAudit || "", tglSurat: old.tglSurat || "" }]);
        } else {
          setStList([{ id: "st0", idx: 0, nomor: "", bulan: "", tahun: String(now.getFullYear()), tglAudit: reg.tanggalAudit || "", tglSurat: reg.tanggalAudit || "" }]);
        }
      }
      setStLoaded(true);
    })();
  }, [reg.id]);

  const saveStList = async (newList) => {
    setStList(newList);
    await api.setState("st_list_" + reg.id, newList);
  };

  const addStEntry = () => {
    // Auto-pick the first facility not yet used
    const usedIdx = new Set(stList.map(s => s.idx));
    const nextIdx = fasilitasList.findIndex((_, i) => !usedIdx.has(i));
    const idx = nextIdx >= 0 ? nextIdx : 0;
    const newEntry = { id: "st" + Date.now(), idx, nomor: "", bulan: "", tahun: String(new Date().getFullYear()), tglAudit: reg.tanggalAudit || "", tglSurat: reg.tanggalAudit || "" };
    saveStList([...stList, newEntry]);
  };

  const removeStEntry = (id) => {
    saveStList(stList.filter(s => s.id !== id));
  };

  const updateStEntry = (id, field, value) => {
    saveStList(stList.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const docs = [
    {
      key: "spk", label: "Surat Perjanjian Kerjasama (SPK)",
      desc: "Perjanjian kerjasama antara LPH UIN Jakarta dengan pelaku usaha.",
      icon: "🤝",
    },
    {
      key: "berkas", label: "Berkas Audit",
      desc: "Paket dokumen audit: agenda, daftar hadir auditor, daftar hadir perusahaan.",
      icon: "📁",
    },
  ];

  const requiredFields = [
    { key: "namaPU", label: "Nama Pelaku Usaha" },
    { key: "alamat", label: "Alamat Produksi" },
    { key: "jenisProduk", label: "Jenis Produk" },
    { key: "id", label: "No. Registrasi (SIHALAL)" },
    { key: "tanggalAudit", label: "Tanggal Audit" },
    { key: "leadAuditor", label: "Lead Auditor" },
  ];
  const missing = requiredFields.filter(f => !reg[f.key]);
  const canGenerate = missing.length === 0;

  function lihatDoc(doc) {
    setPreviewDoc(doc.key);
  }

  return (
    <div>
      {!canGenerate && (
        <div style={{
          background: C.goldLight, border: `1px dashed ${C.gold}`,
          borderRadius: 5, padding: "10px 14px", marginBottom: 16,
          fontSize: 12, color: C.gold,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠ {t("completeDataWarning")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            {missing.map(f => <li key={f.key}><strong>{f.label}</strong></li>)}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Surat Tugas — one per entry */}
        {stLoaded && stList.map((st, i) => {
          const fas = fasilitasList[st.idx] || fasilitasList[0] || {};
          const fasLabel = fas.nama ? ` — ${fas.nama}` : "";
          const fasSub = `${fas.alamat || reg.alamat || ""}${fas.kota ? `, ${fas.kota}` : ""}`;
          return (
            <div key={st.id} style={{
              border: `1px solid ${C.borderLight}`, borderRadius: 6,
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
              background: C.bg,
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>📋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                  Surat Tugas (ST){fasLabel}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                  Surat penugasan auditor dari Direktur LPH untuk melaksanakan audit halal.
                </div>
                {/* Facility selector */}
                {fasLoaded && fasilitasList.length > 1 && (
                  <select
                    value={st.idx}
                    onChange={e => updateStEntry(st.id, "idx", parseInt(e.target.value))}
                    style={{
                      fontSize: 11, fontFamily: font, border: `1px solid ${C.border}`, borderRadius: 4,
                      padding: "3px 6px", background: C.bg, color: C.text, maxWidth: "100%",
                    }}
                  >
                    {fasilitasList.map((f, fi) => (
                      <option key={fi} value={fi}>
                        {f.nama || `Fasilitas ${fi + 1}`} — {f.alamat || reg.alamat}{f.kota ? `, ${f.kota}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {fasLoaded && fasilitasList.length <= 1 && (
                  <div style={{ fontSize: 11, color: C.faint }}>{fasSub}</div>
                )}
              </div>
              <Btn variant="primary" small disabled={!canGenerate} onClick={() => setPreviewDoc({ type: "st", stIndex: i })}>
                🔍 Lihat
              </Btn>
              <Btn variant="secondary" small onClick={() => setEditDoc({ type: "st", stIndex: i })}>
                ✏ Edit
              </Btn>
              {stList.length > 1 && (
                <button onClick={() => removeStEntry(st.id)} style={{
                  background: "transparent", border: "none", color: "red", cursor: "pointer",
                  fontSize: 16, lineHeight: 1, padding: "0 2px", flexShrink: 0,
                }} title="Hapus Surat Tugas">🗑</button>
              )}
            </div>
          );
        })}
        {stLoaded && fasLoaded && fasilitasList.length > stList.length && (
          <div style={{ textAlign: "center" }}>
            <button onClick={addStEntry} style={{
              background: "transparent", border: `1px dashed ${C.blue}`, borderRadius: 6,
              padding: "8px 18px", fontSize: 12, color: C.blue, cursor: "pointer",
              fontFamily: font, fontWeight: 500,
            }}>
              + Tambah Surat Tugas
            </button>
          </div>
        )}
        {/* Remaining docs (SPK, Berkas) */}
        {docs.map(doc => (
          <div key={doc.key} style={{
            border: `1px solid ${C.borderLight}`, borderRadius: 6,
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
            background: C.bg,
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{doc.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{doc.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{doc.desc}</div>
            </div>
            <Btn variant="primary" small disabled={!canGenerate} onClick={() => setPreviewDoc({ type: doc.key })}>
              🔍 Lihat
            </Btn>
            {doc.key === "spk" && (
              <Btn variant="secondary" small onClick={() => setEditDoc({ type: "spk" })}>
                ✏ Edit
              </Btn>
            )}
            {doc.key === "berkas" && (
              <Btn variant="secondary" small onClick={() => setEditDoc({ type: "berkas" })}>
                ✏ Edit
              </Btn>
            )}
          </div>
        ))}
      </div>

      {/* {t("confirmPreAudit")} */}
      {(() => {
        const [preChecked, setPreChecked] = useState(false);
        const [preDate, setPreDate] = useState("");
        const [preBy, setPreBy] = useState("");
        useEffect(() => {
          (async () => {
            const saved = await api.getState("tl_"+reg.id).then(r => r.value);
            if (saved) {
              try { const d = JSON.parse(saved);
                if (d.preAuditChecked && d.preAuditDate && d.preAuditBy) {
                  setPreChecked(true);
                  setPreDate(d.preAuditDate);
                  setPreBy(d.preAuditBy);
                }
              } catch {}
            }
          })();
        }, [reg.id]);
        const confirmPreAudit = async () => {
          const sess = (() => { try { return JSON.parse(sessionStorage.getItem("hars_session")); } catch { return null; } })();
          const who = sess?.nama || "System";
          const today = new Date().toISOString().slice(0,10);
          const data = { preAuditChecked: true, preAuditDate: today, preAuditBy: who };
          await api.setState("tl_"+reg.id, JSON.stringify(data));
          setPreChecked(true); setPreDate(today); setPreBy(who);
          if (onPreAuditConfirm) onPreAuditConfirm();
        };
        return (
          <div style={{ marginTop:20, padding:"14px 16px", background:preChecked?C.greenLight:C.bgAlt,
            borderRadius:8, border:`1px solid ${preChecked?C.green:C.borderLight}`, fontSize:12 }}>
            <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:8 }}>{t("confirmPreAudit")}</div>
            {preChecked ? (
              <div>
                <div style={{ color:C.green, fontSize:12, marginBottom:8 }}>
                  ✓ Dikonfirmasi oleh <strong>{preBy}</strong> pada <strong>{fmtDate(preDate)}</strong>
                </div>
                <Btn variant="ghost" small onClick={async () => {
                  const data = { preAuditChecked: false, preAuditDate: "", preAuditBy: "" };
                  await api.setState("tl_"+reg.id, JSON.stringify(data));
                  setPreChecked(false); setPreDate(""); setPreBy("");
                  if (onPreAuditConfirm) onPreAuditConfirm();
                }}>Batalkan Konfirmasi</Btn>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ color:C.muted }}>Belum dikonfirmasi.</span>
                <Btn variant="primary" small onClick={confirmPreAudit}>Konfirmasi Sekarang</Btn>
              </div>
            )}
          </div>
        );
      })()}

      <div style={{
        marginTop: 16, padding: "12px 14px",
        background: C.bgAlt, borderRadius: 5, border: `1px solid ${C.borderLight}`,
        fontSize: 11, color: C.muted,
      }}>
        <strong style={{ color: C.text }}>Catatan:</strong> Surat Tugas dan SPK akan dibuka di modal preview dengan nomor surat yang bisa diedit. Klik Cetak untuk mencetak atau simpan sebagai PDF.
        Dokumen dengan tanda tangan akan diupload setelah ditandatangani di tab <strong>Dokumen Pendukung</strong>.
      </div>

      <div style={{
        marginTop: 12, padding: "12px 14px",
        background: C.amberLight || "#fbf2dd", borderRadius: 5, border: `1px solid ${C.borderLight}`,
        fontSize: 11, color: C.muted,
      }}>
        <strong style={{ color: "#a36a00" }}>Penting:</strong> Konfirmasi Nomor Surat pada Surat Tugas dan SPK ke Admin LPH.
      </div>

      {previewDoc?.type === "st" && (
        <DocPreviewModal
          reg={reg}
          facility={fasilitasList[stList[previewDoc.stIndex]?.idx ?? 0] || fasilitasList[0] || {}}
          stMeta={stList[previewDoc.stIndex] || {}}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      {previewDoc?.type === "spk" && (
        <SPKPreviewModal
          reg={reg}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      {previewDoc?.type === "berkas" && (
        <BerkasPreviewModal
          reg={reg}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      {editDoc?.type === "st" && (
        <STEditModal
          reg={reg}
          stEntry={stList[editDoc.stIndex] || {}}
          stIndex={editDoc.stIndex}
          onClose={() => setEditDoc(null)}
          onSave={(updated) => {
            saveStList(stList.map((s, i) => i === editDoc.stIndex ? updated : s));
            setEditDoc(null);
          }}
        />
      )}
      {editDoc?.type === "spk" && (
        <SPKEditModal
          reg={reg}
          onClose={() => setEditDoc(null)}
        />
      )}
      {editDoc?.type === "berkas" && (
        <BerkasEditModal
          reg={reg}
          onClose={() => setEditDoc(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Laporan Audit ───────────────────────────────────────────────────────
function TabLaporan({ reg, isAdmin }) {
  const role = isAdmin ? "admin" : "auditor";
  const [auditors, setAuditors] = useState(AUDITORS);
  useEffect(() => {
    api.listAuditors().then(list => {
      const updated = list && list.length ? list : [];
      AUDITORS = updated;
      setAuditors(updated);
    }).catch(() => {});
  }, [reg?.id]);
  return <HARSReportEditor reg={reg} role={role} auditors={auditors} />;
}

// ─── Tab: Laporan Audit ───────────────────────────────────────────────────────

// ─── Workspace (tabbed view for one registration) ────────────────────────────

function Workspace({ reg, onUpdate, onBack, role }) {
  const { t } = useLang();
  const TABS = [
    { key: "data", label: t("dataPengajuan") },
    { key: "preaudit", label: t("preAudit") },
    { key: "laporan", label: t("laporan") },
    { key: "dokumentasi", label: t("dokumentasi") },
  ];
  const [activeTab, setActiveTab] = useState("data");
  const [editing, setEditing] = useState(false);
  const [tlVersion, setTlVersion] = useState(0);
  const isAdmin = role === "admin";

  return (
    <div>
      <div id="ws-chrome">
      {/* Back + title */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.blue, fontSize: 12.5, fontFamily: font, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4, padding: "4px 0",
        }}>← {t("back")}</button>
        <span style={{ color: C.faint }}>/</span>
        <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>Workspace</span>
      </div>

      {/* Head card */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.borderLight}`, borderRadius: 14,
        padding: "22px 24px", marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 24,
        position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: C.blue }}></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: C.blue, marginBottom: 6 }}>
              {reg.jenisPendaftaran || "Pengajuan Baru"}
            </div>
            <Btn variant="secondary" small onClick={() => setEditing(true)}>✏ Edit Data</Btn>
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.015em", color: C.text }}>{reg.namaPU}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", color: C.muted, fontSize: 13 }}>
            <span style={{ fontFamily: mono, color: C.text, fontWeight: 500 }}>{reg.id}</span>
            <span style={{ width: 1, height: 14, background: C.borderLight, display: "inline-block" }}></span>
            <span>Didaftarkan <b style={{ color: C.text, fontWeight: 600 }}>{fmtDate(reg.tanggalDaftar)}</b></span>
            {reg.tanggalAudit && (<>
              <span style={{ width: 1, height: 14, background: C.borderLight, display: "inline-block" }}></span>
              <span>Jadwal audit <b style={{ color: C.text, fontWeight: 600 }}>{fmtDate(reg.tanggalAudit)}</b></span>
            </>)}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", borderBottom: `2px solid ${C.borderLight}`,
        marginTop: 20, marginBottom: 24, gap: 0, overflowX: "auto",
      }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: "none", border: "none", borderBottom: activeTab === tab.key ? `2px solid ${C.blue}` : "2px solid transparent",
            marginBottom: -2, color: activeTab === tab.key ? C.blue : C.muted,
            padding: "8px 18px", fontSize: 13, fontFamily: font, fontWeight: activeTab === tab.key ? 600 : 400,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>

      </div>
      {/* Tab content */}
      {activeTab === "data" && (
        <div style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) 320px",gap:20,alignItems:"flex-start" }}>
          <TabDataPengajuan reg={reg} onUpdate={onUpdate} isAdmin={isAdmin} editing={editing} setEditing={setEditing} />
          <DataSidebar reg={reg} tlVersion={tlVersion} />
        </div>
      )}
      {activeTab === "preaudit" && <TabPreAudit reg={reg} isAdmin={isAdmin} onPreAuditConfirm={() => setTlVersion(v => v+1)} />}
      {activeTab === "laporan" && <TabLaporan reg={reg} isAdmin={isAdmin} />}
      {activeTab === "dokumentasi" && <TabDokumentasi reg={reg} />}
    </div>
  );
}

// ─── Dashboard CSS ────────────────────────────────────────────────────────

const DASHBOARD_STYLES = `
.hd{font-family:'Plus Jakarta Sans',system-ui,sans-serif;--ink:#0b1220;--ink-2:#1c2538;--muted:#5b6478;--muted-2:#8a93a6;--line:#e6e8ee;--line-2:#eef0f5;--bg:#f5f6f3;--paper:#fff;--navy:#0a6fc0;--navy-2:#075aa0;--blue:#0a6fc0;--blue-soft:#eaf3fb;--emerald:#0f7a4a;--emerald-2:#0a5a37;--emerald-soft:#e7f3ec;--amber:#a36a00;--amber-soft:#fbf2dd;--rose:#a83246;--rose-soft:#fbe7eb;--violet:#4b3b8a;--violet-soft:#ebe7f6}
.hd *{box-sizing:border-box}.hd{background:var(--bg);color:var(--ink);font-size:14px;line-height:1.45;min-height:100vh}

/* Top bar */
.hd-top{background:var(--navy);color:#fff;display:flex;align-items:stretch;height:56px;border-bottom:1px solid #0a1f3a;position:sticky;top:0;z-index:100}
.hd-top .brand{display:flex;align-items:center;gap:14px;padding:0 22px;border-right:1px solid rgba(255,255,255,.10);flex-shrink:0}
.hd-mark{width:30px;height:30px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#fff}
.hd-mark img{width:100%;height:100%;display:block;object-fit:contain}
.hd-brand-text{display:flex;flex-direction:column;line-height:1.1}
.hd-brand-text b{font-weight:800;letter-spacing:.06em;font-size:14px}
.hd-brand-text span{color:#9fb8db;font-size:11px;letter-spacing:.04em;text-transform:uppercase}
.hd-right{margin-left:auto;display:flex;align-items:center;gap:6px;padding-right:14px;flex-shrink:0}
.hd-pill{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border-radius:8px;background:rgba(255,255,255,.06);color:#dbe6f6;font-size:12px;font-weight:500;border:1px solid rgba(255,255,255,.10)}
.hd-pill .dot{width:6px;height:6px;border-radius:50%;background:#3ad36a;box-shadow:0 0 0 2px rgba(58,211,106,.18)}
.hd-pill.user{padding:2px 2px 2px 10px;gap:8px}
.hd-pill.user .role{color:#9fb8db;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.hd-pill.user .avatar{width:26px;height:26px;border-radius:6px;background:var(--blue);display:grid;place-items:center;color:#fff;font-weight:700;font-size:11px}
.hd-icon-btn{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);display:grid;place-items:center;cursor:pointer;color:#cfd9eb}
.hd-icon-btn:hover{background:rgba(255,255,255,.12)}

/* Page layout */
.hd-page{max-width:1360px;margin:0 auto;padding:22px 32px 40px}
.hd-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:20px}
.hd-head h1{margin:0 0 4px;font-size:26px;font-weight:800;letter-spacing:-.015em;color:var(--ink)}
.hd-head .sub{color:var(--muted);font-size:13.5px}
.hd-head .sub b{color:var(--ink-2);font-weight:600}
.hd-head-actions{display:flex;gap:8px;align-items:center}
.hd-btn{height:36px;padding:0 12px;border-radius:8px;font-family:inherit;font-size:12.5px;font-weight:600;border:1px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:background .15s,border-color .15s;white-space:nowrap}
.hd-btn:hover{border-color:#cdd2dc;background:#fafbfc}
.hd-btn.primary{background:var(--navy);border-color:var(--navy);color:#fff}
.hd-btn.primary:hover{background:var(--navy-2);border-color:var(--navy-2)}
.hd-btn.ghost{background:transparent}
.hd-btn svg{width:13px;height:13px;flex-shrink:0}

/* Stats */
.hd-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.hd-stat{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:18px 18px 16px;position:relative;overflow:hidden}
.hd-stat .lbl{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.hd-stat .lbl .ic{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;flex-shrink:0}
.hd-stat .num{font-family:'JetBrains Mono',monospace;font-size:34px;font-weight:600;letter-spacing:-.02em;margin:10px 0 4px;color:var(--ink);font-feature-settings:"tnum","zero"}
.hd-stat .num .unit{font-size:16px;color:var(--muted);margin-left:4px;font-weight:500}
.hd-stat .meta{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px}
.hd-stat .delta{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:11px;padding:1px 5px;border-radius:4px}
.delta.up{color:var(--emerald-2);background:var(--emerald-soft)}
.delta.flat{color:var(--muted);background:var(--line-2)}
.hd-stat .spark{position:absolute;right:14px;top:18px;width:80px;height:28px;opacity:.7}
.hd-stat.accent-blue .lbl .ic{background:var(--blue-soft);color:var(--blue)}
.hd-stat.accent-emerald .lbl .ic{background:var(--emerald-soft);color:var(--emerald-2)}
.hd-stat.accent-amber .lbl .ic{background:var(--amber-soft);color:var(--amber)}
.hd-stat.accent-violet .lbl .ic{background:var(--violet-soft);color:var(--violet)}

/* Main grid */
.hd-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px}
.hd-panel{background:var(--paper);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.hd-panel-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 14px;border-bottom:1px solid var(--line-2);gap:12px;flex-wrap:wrap}
.hd-panel-title h2{margin:0;font-size:16px;font-weight:700;letter-spacing:-.01em}
.hd-panel-title .pt-sub{color:var(--muted);font-size:12px;margin-top:2px}

/* Filters */
.hd-filters{display:flex;flex-direction:column;gap:8px;padding:12px 18px 0}
.hd-search{position:relative;flex:1}
.hd-search input{width:100%;height:36px;border-radius:8px;border:1px solid var(--line);background:#fff;padding:0 12px 0 34px;font-family:inherit;font-size:13px;color:var(--ink);outline:none;box-sizing:border-box}
.hd-search input:focus{border-color:#aac2e8;box-shadow:0 0 0 3px rgba(10,111,192,.12)}
.hd-search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted-2);width:13px;height:13px}
.hd-filter-row{display:flex;gap:10px;flex-wrap:wrap}
.hd-select{height:36px;border-radius:8px;border:1px solid var(--line);background:#fff;padding:0 28px 0 10px;font:inherit;font-size:12.5px;color:var(--ink);appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%235b6478' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");background-repeat:no-repeat;background-position:right 10px center}

/* Table */
.hd-table{width:100%;border-collapse:collapse;font-size:13px}
.hd-table thead th{text-align:left;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:10px 16px;background:#fbfbf8;border-bottom:1px solid var(--line)}
.hd-table tbody td{padding:13px 16px;border-bottom:1px solid var(--line-2);vertical-align:middle}
.hd-table tbody tr:last-child td{border-bottom:0}
.hd-table tbody tr:hover{background:#fafbfc}
.hd-table tbody tr.selected{background:#f1f6fd}
.hd-nodaftar{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--ink-2);font-weight:500}
.hd-pu-name{font-weight:700;color:var(--ink);letter-spacing:-.005em}
.hd-pu-sub{color:var(--muted);font-size:11px;margin-top:1px}
.hd-avatar-sm{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700;flex-shrink:0;color:var(--navy);background:#dde4ef}
.hd-progress{display:flex;align-items:center;gap:8px}
.hd-progress .bar{flex:1;height:6px;background:var(--line-2);border-radius:99px;overflow:hidden;min-width:80px;max-width:120px}
.hd-progress .bar > i{display:block;height:100%;background:var(--emerald);border-radius:99px}
.hd-progress .bar.blue > i{background:var(--blue)}
.hd-progress .pct{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);min-width:28px;text-align:right}
.hd-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:99px;font-size:11px;font-weight:600;line-height:1}
.hd-badge .d{width:5px;height:5px;border-radius:50%}
.hd-badge.gray{background:var(--line-2);color:var(--muted)}.hd-badge.gray .d{background:#9aa3b6}
.hd-badge.blue{background:var(--blue-soft);color:var(--blue)}.hd-badge.blue .d{background:var(--blue)}
.hd-badge.gold{background:var(--amber-soft);color:var(--amber)}.hd-badge.gold .d{background:#d49519}
.hd-badge.green{background:var(--emerald-soft);color:var(--emerald-2)}.hd-badge.green .d{background:var(--emerald)}
.hd-badge.red{background:var(--rose-soft);color:var(--rose)}.hd-badge.red .d{background:var(--rose)}
.hd-actions{display:flex;gap:4px;justify-content:flex-end}
.hd-action{width:28px;height:28px;border-radius:6px;border:1px solid var(--line);background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--muted)}
.hd-action:hover{color:var(--ink);border-color:#cdd2dc}
.hd-action.primary{width:auto;padding:0 9px;color:var(--blue);border-color:#cfdef5;font:inherit;font-size:11.5px;font-weight:600;gap:5px;display:inline-flex}
.hd-action.primary:hover{background:var(--blue-soft)}
.hd-due{font-family:'JetBrains Mono',monospace;font-size:12px}
.hd-due small{display:block;font-size:10px;color:var(--muted);font-weight:500;margin-top:2px;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:.04em;text-transform:uppercase}
.hd-due.warn{color:var(--amber)}

/* Side */
.hd-side{display:flex;flex-direction:column;gap:18px}
.hd-alert{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;gap:12px;align-items:flex-start;border-left:3px solid var(--amber)}
.hd-alert .ic{width:30px;height:30px;border-radius:8px;background:var(--amber-soft);color:var(--amber);display:grid;place-items:center;flex-shrink:0}
.hd-alert h3{margin:0 0 2px;font-size:13px;font-weight:700}
.hd-alert p{margin:0 0 6px;font-size:12px;color:var(--muted);line-height:1.5}
.hd-alert a{color:var(--blue);font-weight:600;font-size:12px;text-decoration:none}
.hd-auditors h3{margin:0;font-size:13px;font-weight:700}
.hd-aud-row{display:flex;align-items:center;gap:12px;padding:11px 18px;border-top:1px solid var(--line-2)}
.hd-aud-row:first-of-type{border-top:0}
.hd-aud-row .name{font-weight:600;font-size:13px}
.hd-aud-row .meta{color:var(--muted);font-size:11px;margin-top:1px}
.hd-aud-row .load{margin-left:auto;text-align:right}
.hd-aud-row .load .n{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:13px;color:var(--ink)}
.hd-aud-row .load .l{font-size:10px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
.hd-avatar-md{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;font-weight:700;font-size:12px;flex-shrink:0}
.hd-activity{padding:4px 0 10px}
.hd-act-item{display:flex;gap:12px;padding:9px 18px;position:relative}
.hd-act-item .tl{position:absolute;left:31px;top:0;bottom:0;width:1px;background:var(--line)}
.hd-act-item:first-child .tl{top:18px}
.hd-act-item:last-child .tl{bottom:calc(100% - 18px)}
.hd-act-dot{width:8px;height:8px;border-radius:50%;background:#fff;border:2px solid var(--blue);margin-left:8px;margin-top:7px;flex-shrink:0;z-index:1}
.hd-act-dot.green{border-color:var(--emerald)}
.hd-act-dot.amber{border-color:#d49519}
.hd-act-dot.gray{border-color:#9aa3b6}
.hd-act-body{flex:1;font-size:12px;color:var(--ink-2);line-height:1.45}
.hd-act-body b{font-weight:700}
.hd-act-time{font-size:10.5px;color:var(--muted-2);font-family:'JetBrains Mono',monospace;margin-top:2px}
.hd-tfoot{display:flex;align-items:center;justify-content:space-between;padding:11px 18px;border-top:1px solid var(--line-2);background:#fbfbf8;font-size:12px;color:var(--muted)}
.hd-pager{display:flex;align-items:center;gap:4px}
.hd-pgbtn{width:28px;height:28px;border-radius:6px;border:1px solid var(--line);background:#fff;font:inherit;font-size:12px;font-weight:600;color:var(--muted);display:inline-grid;place-items:center;cursor:pointer}
.hd-pgbtn.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.hd-pgbtn:disabled{opacity:.45;cursor:default}

@media(max-width:900px){
  .hd-stats{grid-template-columns:repeat(2,1fr)}
  .hd-grid{grid-template-columns:1fr}
  .hd-head{flex-direction:column;align-items:flex-start}
  .hd-top .brand{padding:0 14px}
  .hd-page{padding:16px}
  .hd-filters{flex-direction:column;align-items:stretch}
  .hd-filter-row{flex-direction:column}
}
`;

// ─── Top Bar ──────────────────────────────────────────────────────────────

function TopBar({ role, roleLabel, currentUser, onNavigateUsers, onLogout, onSettings }) {
  const { lang, setLang, t, nextLang } = useLang();
  const rl = role === "admin" ? t("adminLPH") : role === "observer" ? t("observer") : t("auditor");
  return (
    <header className="hd-top">
      <div className="brand">
        <div className="hd-mark"><img src="/favicon.png" alt="HARS"/></div>
        <div className="hd-brand-text">
          <b>HARS</b>
          <span>LPH UIN Jakarta</span>
        </div>
      </div>
      <div className="hd-right">
        <button onClick={() => setLang(nextLang[lang])} style={{
          background: "none", border: "1px solid var(--line)", borderRadius: 6,
          padding: "3px 10px", fontSize: 11, cursor: "pointer", color: "var(--muted)",
          fontFamily: "inherit", marginRight: 8,
        }} title={`Switch to ${nextLang[lang].toUpperCase()}`}>
          {lang.toUpperCase()}
        </button>
        <span className="hd-pill"><span className="dot"></span>{t("systemNormal")}</span>
        {role === "admin" && (
          <button className="hd-icon-btn" title={t("settings")} onClick={onSettings}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        )}
        {role === "admin" && (
          <button className="hd-icon-btn" title={t("manageUsers")} onClick={onNavigateUsers}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </button>
        )}
        <span className="hd-pill user">
          <span className="role">{rl}</span>
          <span className="avatar">{currentUser?.nama?.charAt(0) || "U"}</span>
        </span>
        <button className="hd-icon-btn" title={t("logout")} onClick={onLogout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </header>
  );
}

// ─── Stats Cards ──────────────────────────────────────────────────────────

function StatsCards({ stats, regCount }) {
  const { t } = useLang();
  const defaultStats = stats || {};
  const formatSize = bytes => {
    if (!bytes && bytes !== 0) return "—";
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1);
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1);
    if (bytes >= 1024) return (bytes / 1024).toFixed(0);
    return bytes;
  };
  const sizeUnit = bytes => {
    if (!bytes && bytes !== 0) return "";
    if (bytes >= 1073741824) return "GB";
    if (bytes >= 1048576) return "MB";
    if (bytes >= 1024) return "KB";
    return "B";
  };
  const nRegs = regCount ?? defaultStats.registrations ?? 0;
  const nAuditors = defaultStats.auditors ?? 0;
  const diskSize = formatSize(defaultStats.diskBytes || 0);
  const diskU = sizeUnit(defaultStats.diskBytes || 0);

  return (
    <section className="hd-stats">
      <div className="hd-stat accent-blue">
        <div className="lbl">
          <span className="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
          {t("totalRegs")}
        </div>
        <div className="num">{nRegs}</div>
      </div>

      <div className="hd-stat accent-emerald">
        <div className="lbl">
          <span className="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
          {t("totalAuditors")}
        </div>
        <div className="num">{nAuditors}</div>
      </div>

      <div className="hd-stat accent-amber">
        <div className="lbl">
          <span className="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
          {t("activeAudits")}
        </div>
        <div className="num">{nRegs}</div>
      </div>

      <div className="hd-stat accent-violet">
        <div className="lbl">
          <span className="ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
          {t("systemStorage")}
        </div>
        <div className="num">{diskSize} <span className="unit">{diskU}</span></div>
      </div>
    </section>
  );
}

// ─── Registration Table ───────────────────────────────────────────────────

function RegTable({ regs, onOpen, onDelete, isAdmin }) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterAuditor, setFilterAuditor] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const now = new Date();
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  const regStatus = reg => {
    if (!reg.leadAuditor) return "draft";
    if (reg.status === "completed" || reg.status === "done") return "done";
    if (reg.status === "perbaikan") return "perbaikan";
    if (reg.tanggalAudit && new Date(reg.tanggalAudit + "T00:00:00") <= new Date()) return "field";
    if (reg.tanggalAudit) return "scheduled";
    return "preaudit";
  };

  const filtered = regs.filter(r => {
    const q = search.toLowerCase();
    if (q && !(r.id && r.id.toLowerCase().includes(q)) &&
      !(r.namaPU && r.namaPU.toLowerCase().includes(q)) &&
      !(r.jenisProduk && r.jenisProduk.toLowerCase().includes(q))) return false;
    if (filterJenis && r.jenisProduk !== filterJenis) return false;
    if (filterAuditor) {
      const aid = parseInt(filterAuditor);
      if (r.leadAuditor !== aid && r.auditor !== aid && r.auditor2 !== aid && r.auditor3 !== aid) return false;
    }
    return true;
  });

  const fmtDateShort = iso => {
    if (!iso) return { label: "—", cls: "" };
    const d = new Date(iso);
    const diffDays = Math.round((d - now) / 86400000);
    const label = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    let cls = "";
    if (diffDays < 0) cls = "hd-due";
    else if (diffDays <= 3) cls = "hd-due warn";
    return { label, cls, isToday: diffDays === 0 };
  };

  return (
    <section className="hd-panel">
      {deleteTarget && (
        <DeleteModal
          reg={deleteTarget}
          onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <div style={{background:`linear-gradient(160deg,var(--blue) 0%,var(--navy-2) 100%)`,color:"#fff",
        borderRadius:14,padding:"18px 24px",marginBottom:18,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-30,top:-30,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}></div>
        <div style={{position:"absolute",right:-50,bottom:-50,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}></div>
        <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.01em",color:"#fff"}}>Daftar Registrasi</h2>
            <div style={{fontSize:13,opacity:0.85,marginTop:4}}>Pelaku usaha & status audit halal di workspace</div>
          </div>
        </div>
      </div>

      <div className="hd-filters">
        <div className="hd-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder={t("searchRegs")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <div className="hd-filter-row">
            <select className="hd-select" value={filterJenis} onChange={e => setFilterJenis(e.target.value)}>
              <option value="">Semua jenis produk</option>
              {JENIS_PRODUK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="hd-select" value={filterAuditor} onChange={e => setFilterAuditor(e.target.value)}>
              <option value="">Semua auditor</option>
              {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
            </select>
            <select className="hd-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{flex:1}}>
              <option value="">Bulan ini · {months[now.getMonth()]} {now.getFullYear()}</option>
              <option value="all">Semua bulan</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
      <table className="hd-table">
        <thead>
          <tr>
            <th style={{ paddingLeft: 18 }}>No. Daftar</th>
            <th>Pelaku Usaha</th>
            <th>{t("productTypeLabel")}</th>
            <th>Lead Auditor</th>
            <th>Status</th>
            <th>Tgl Audit</th>
            <th style={{ paddingRight: 18, textAlign: "right" }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                {search ? t("noSearchResults") : t("noRegistrations")}
              </td>
            </tr>
          )}
          {filtered.map((reg, i) => {
            const st = regStatus(reg);
            const badgeMap = { draft: "gray", preaudit: "gold", scheduled: "blue", field: "blue", perbaikan: "gold", done: "green" };
            const labelMap = { draft: "Draft", preaudit: "Pre-Audit", scheduled: "Terjadwal", field: "Audit Lapangan", perbaikan: "Perbaikan", done: "Selesai" };
            const due = fmtDateShort(reg.tanggalAudit);
            const lead = AUDITORS.find(a => a.id === reg.leadAuditor);
            return (
              <tr key={reg.id} style={{ cursor: "pointer" }} onClick={() => onOpen(reg.id)}>
                <td style={{ paddingLeft: 18 }}><span className="hd-nodaftar">{reg.id}</span></td>
                <td>
                  <div className="hd-pu-name">{reg.namaPU}</div>
                  {reg.alamat && <div className="hd-pu-sub">{reg.alamat}</div>}
                </td>
                <td>
                  {reg.jenisProduk}
                  <div className="hd-pu-sub">{reg.namaUsaha || ""}</div>
                </td>
                <td>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{lead?.nama || "—"}</div>
                    <div className="hd-pu-sub">{lead?.reg || ""}</div>
                  </div>
                </td>
                <td><span className={`hd-badge ${badgeMap[st] || "gray"}`}><span className="d"></span> {labelMap[st] || st}</span></td>
                <td>
                  {reg.tanggalAudit ? (
                    <span className={due.cls}>
                      {due.label}
                      {due.isToday && <small>Hari ini</small>}
                    </span>
                  ) : (
                    <span className="hd-badge gold"><span className="d"></span> Belum</span>
                  )}
                </td>
                <td style={{ paddingRight: 18 }}>
                  <div className="hd-actions">
                    <button className="hd-action primary" onClick={e => { e.stopPropagation(); onOpen(reg.id); }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      Buka
                    </button>
                    {isAdmin && (
                      <button className="hd-action" title="Hapus" onClick={e => { e.stopPropagation(); setDeleteTarget(reg); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      <div className="hd-tfoot">
        <div>Menampilkan <b style={{ color: "var(--ink)" }}>{filtered.length}</b> dari <b style={{ color: "var(--ink)" }}>{regs.length}</b> registrasi</div>
        <div className="hd-pager">
          <button className="hd-pgbtn" disabled>‹</button>
          <button className="hd-pgbtn on">1</button>
          <button className="hd-pgbtn" disabled>›</button>
        </div>
      </div>
    </section>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

function Sidebar({ auditors, regs }) {
  const { t } = useLang();
  const fmtRelTime = dateStr => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.round((now - d) / 3600000);
    if (diff < 1) return "Baru saja";
    if (diff < 24) return `${diff} jam lalu`;
    const days = Math.round(diff / 24);
    if (days === 1) return "Kemarin";
    if (days < 7) return `${days} hari lalu`;
    return `${Math.round(days / 7)} minggu lalu`;
  };

  const sortedRegs = [...regs].sort((a, b) => {
    const da = a.tanggalDaftar || a.createdAt || "";
    const db = b.tanggalDaftar || b.createdAt || "";
    return db.localeCompare(da);
  });

  return (
    <aside className="hd-side">
      {/* Alert */}
      {regs.some(r => r.tanggalAudit) && (
        <div className="hd-alert">
          <div className="ic">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3>{regs.length} registrasi aktif</h3>
          </div>
        </div>
      )}


      {/* Activity feed */}
      <div className="hd-panel">
        <div className="hd-panel-head" style={{ paddingBottom: 10 }}>
          <div className="hd-panel-title">
            <h2>Aktivitas Terbaru</h2>
            <div className="pt-sub">Registrasi terbaru</div>
          </div>
        </div>
        <div className="hd-activity">
          {sortedRegs.length === 0 && (
            <div style={{ padding: "16px 18px", color: "var(--muted)", fontSize: 12 }}>Belum ada aktivitas.</div>
          )}
          {sortedRegs.slice(0, 5).map((reg, i) => {
            const dotColors = ["green", "", "amber", "gray", ""];
            return (
              <div className="hd-act-item" key={reg.id}>
                <div className="tl"></div>
                <div className={`hd-act-dot ${dotColors[i % dotColors.length]}`}></div>
                <div className="hd-act-body">
                  <b>{reg.namaPU}</b> — {reg.jenisProduk || "Registrasi baru"}
                  <div className="hd-act-time">{fmtRelTime(reg.tanggalDaftar || reg.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function HARSApp({ currentUser, onLogout }) {
  const { t } = useLang();
  const role = currentUser?.role || "auditor";
  const [regs, setRegs] = useState([]);
  const [view, setView] = useState("list");
  const [activeRegId, setActiveRegId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await api.listRegistrations();
      setRegs(data);
      setLoading(false);
    })();
    api.getStats().then(setStats).catch(() => {});
  }, []);

  const activeReg = regs.find(r => r.id === activeRegId);
  const openWorkspace = id => { setActiveRegId(id); setView("workspace"); };
  const backToList = () => { setView("list"); setActiveRegId(null); };
  const handleNew = data => {
    setRegs(p => [...p, data]);
    api.createRegistration(data).catch(e => console.warn("Failed to create registration", e));
    setShowNew(false);
    openWorkspace(data.id);
  };
  const handleUpdate = async updated => {
    setRegs(p => p.map(r => r.id === updated.id ? updated : r));
    try { await api.updateRegistration(updated.id, updated); }
    catch (e) { alert("Gagal menyimpan perubahan: " + e.message); }
  };
  const handleDelete = async id => {
    try {
      await api.deleteRegistration(id);
      setRegs(p => p.filter(r => r.id !== id));
      if (activeRegId === id) backToList();
    } catch (e) { alert("Gagal menghapus registrasi: " + e.message); }
  };

  const [showSettings, setShowSettings] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [stats, setStats] = useState(null);
  const [auditorsVer, setAuditorsVer] = useState(0);

  useEffect(() => {
    api.listAuditors().then(list => {
      AUDITORS = list && list.length ? list : [];
      setAuditorsVer(v => v + 1);
    }).catch(() => {
      AUDITORS = [];
      setAuditorsVer(v => v + 1);
    });
  }, []);

  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener("hars:open-settings", handler);
    return () => window.removeEventListener("hars:open-settings", handler);
  }, []);

  const isAdmin = role === "admin";
  const roleLabel = isAdmin ? "Admin LPH" : role === "observer" ? "Observer" : "Auditor";
  const currentAuditor = isAdmin ? null : AUDITORS.find(a => a.user_id === currentUser?.id);
  const displayRegs = currentAuditor
    ? regs.filter(r => r.leadAuditor === currentAuditor.id || r.auditor === currentAuditor.id || r.auditor2 === currentAuditor.id || r.auditor3 === currentAuditor.id)
    : regs;

  if (loading) {
    return (
      <div style={{
        fontFamily: font, background: C.bgPage, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: C.muted,
      }}>
        {t("loading")}
      </div>
    );
  }

  const userName = currentUser?.nama || "User";
  const now = new Date();
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  return (
    <div className="hd">
      <style>{DASHBOARD_STYLES}</style>

      <TopBar role={role} roleLabel={roleLabel} currentUser={currentUser}
        onNavigateUsers={() => setShowUsers(true)} onLogout={onLogout}
        onSettings={() => setShowSettings(true)} />

      {showNew && <NewRegModal onSave={handleNew} onClose={() => setShowNew(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showUsers && <UserManagement onClose={() => { setShowUsers(false); }} />}

      {view === "list" ? (
        <main className="hd-page">

          <div className="hd-head">
            <div>
              <h1>{t("welcomeBack")}, {userName.split(" ")[0]}</h1>
              <p className="sub">{[now.getDate(), months[now.getMonth()], now.getFullYear()].join(" ")}</p>
            </div>
            <div className="hd-head-actions">
              {isAdmin && (
                <button className="hd-btn primary" onClick={() => setShowNew(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {t("newRegistration")}
                </button>
              )}
            </div>
          </div>

          <StatsCards stats={stats} regCount={displayRegs.length} />

          <div className="hd-grid">
            <RegTable regs={displayRegs} onOpen={openWorkspace} onDelete={handleDelete} isAdmin={isAdmin} />
            <Sidebar auditors={AUDITORS} regs={displayRegs} />
          </div>
        </main>
      ) : activeReg ? (
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 24px" }}>
          <Workspace reg={activeReg} onUpdate={handleUpdate} onBack={backToList} role={role} />
        </div>
      ) : null}
    </div>
  );
}
