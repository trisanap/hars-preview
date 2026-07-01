import { useState, useRef, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const AUDITORS = [
  { id: 1, nama: "Dr. Yusraini Dian Inayati Siregar, M.Si.", reg: "REG RI AH 200054823", jk: "Perempuan" },
  { id: 2, nama: "Trisan Andrean Putra, S.Si.", reg: "REG RI AH 100196725", jk: "Laki-laki" },
  { id: 3, nama: "Adi Riyadhi", reg: "REG RI AH 100054723", jk: "Laki-laki" },
  { id: 4, nama: "Dina Rizky Triani", reg: "REG RI AH 200192525", jk: "Perempuan" },
];

const JENIS_PRODUK_OPTIONS = [
  "Penyediaan makanan dan minuman dengan pengolahan",
  "Daging dan produk olahan daging",
  "Produk Bakeri",
  "Kemasan produk",
  "Gula dan pemanis termasuk madu",
  "Serealia dan produk serealia",
  "Minuman dengan pengolahan",
  "Pangan siap saji",
  "Ikan dan produk perikanan",
  "Jasa pengolahan",
  "Barang gunaan",
];

const INITIAL_REGISTRATIONS = [
  {
    id: "SH2026-1-1860101",
    namaPU: "Bakemood Bakehouse (Gita Meirinda)",
    jenisProduk: "Produk Bakeri",
    tanggalDaftar: "2026-01-18",
    tanggalAudit: "2026-04-16",
    leadAuditor: 1,
    auditor: 2,
    observer: null,
    alamat: "Komplek Harperindo Jalan Harapan Permai 1 Blok A2 no. 1B, Cempaka Putih, Ciputat Timur, Tangerang Selatan, Banten",
    agamaPemilik: "Islam",
    jenisPendaftaran: "Pengajuan Baru",
  },
  {
    id: "SH2026-1-2213018",
    namaPU: "Kama Samboga Grup",
    jenisProduk: "Penyediaan makanan dan minuman dengan pengolahan",
    tanggalDaftar: "2026-04-28",
    tanggalAudit: "",
    leadAuditor: 3,
    auditor: 2,
    observer: null,
    alamat: "Ruko Kebayoran Arcade 1 blok C2/29 lantai 1, Pondok Aren",
    agamaPemilik: "Islam",
    jenisPendaftaran: "Pengajuan Baru",
  },
  {
    id: "SH2025-1-825659",
    namaPU: "PT. Selera Rasa Internasional",
    jenisProduk: "Gula dan pemanis termasuk madu",
    tanggalDaftar: "2025-09-25",
    tanggalAudit: "2025-11-10",
    leadAuditor: 1,
    auditor: 4,
    observer: null,
    alamat: "Jl. Industri Raya No. 12, Tangerang",
    agamaPemilik: "Islam",
    jenisPendaftaran: "Pengajuan Baru",
  },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  blue: "#1565c0",
  blueLight: "#e3f0fb",
  blueMid: "#1976d2",
  gold: "#b8860b",
  goldLight: "#fdf8e8",
  red: "#c0392b",
  redLight: "#fce4ec",
  green: "#1b5e20",
  greenLight: "#e8f5e9",
  text: "#1a1a1a",
  muted: "#555",
  faint: "#888",
  border: "#d0d0d0",
  borderLight: "#e8e8e8",
  bg: "#fff",
  bgAlt: "#f7f7f5",
  bgPage: "#f0ede8",
  sidebar: "#1a1a2e",
  sidebarHov: "#16213e",
};

const font = "'IBM Plex Sans', sans-serif";
const mono = "'IBM Plex Mono', monospace";

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
  const [typed, setTyped] = useState("");
  const match = typed.trim().toLowerCase() === reg.namaPU.trim().toLowerCase();
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
          ⚠ Hapus Registrasi
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: C.text, marginBottom: 14, lineHeight: 1.6 }}>
            Tindakan ini <strong>tidak dapat dibatalkan</strong>. Semua data workspace untuk{" "}
            <strong>{reg.namaPU}</strong> ({reg.id}) akan dihapus permanen.
          </p>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            Ketik nama pelaku usaha untuk konfirmasi:
          </p>
          <code style={{
            display: "block", background: C.bgAlt, border: `1px solid ${C.border}`,
            borderRadius: 4, padding: "6px 10px", fontSize: 12,
            fontFamily: mono, marginBottom: 10, color: C.text,
          }}>{reg.namaPU}</code>
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
            <Btn variant="ghost" onClick={onClose}>Batal</Btn>
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
  const [form, setForm] = useState({
    id: "", namaPU: "", jenisProduk: "", tanggalDaftar: "",
    tanggalAudit: "", leadAuditor: "", auditor: "", observer: "",
    alamat: "", agamaPemilik: "Islam", jenisPendaftaran: "Pengajuan Baru",
  });
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const inp = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 4,
    padding: "7px 10px", fontSize: 13, fontFamily: font, outline: "none",
    color: C.text, background: C.bg, boxSizing: "border-box",
  };
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
          <span>+ Registrasi Baru</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                NO. DAFTAR (SIHALAL) *
              </label>
              <input value={form.id} onChange={f("id")} style={inp}
                placeholder="SH2026-1-xxxxxxx" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                TANGGAL DAFTAR
              </label>
              <input type="date" value={form.tanggalDaftar} onChange={f("tanggalDaftar")} style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
              NAMA PELAKU USAHA *
            </label>
            <input value={form.namaPU} onChange={f("namaPU")} style={inp}
              placeholder="Nama perusahaan sesuai SIHALAL" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                JENIS PRODUK *
              </label>
              <select value={form.jenisProduk} onChange={f("jenisProduk")} style={inp}>
                <option value="">— Pilih —</option>
                {JENIS_PRODUK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                JENIS PENDAFTARAN
              </label>
              <select value={form.jenisPendaftaran} onChange={f("jenisPendaftaran")} style={inp}>
                <option>Pengajuan Baru</option>
                <option>Perpanjangan</option>
                <option>Perubahan</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
              ALAMAT PRODUKSI
            </label>
            <input value={form.alamat} onChange={f("alamat")} style={inp} placeholder="Alamat fasilitas produksi" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                AGAMA PEMILIK
              </label>
              <select value={form.agamaPemilik} onChange={f("agamaPemilik")} style={inp}>
                <option>Islam</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                TANGGAL AUDIT
              </label>
              <input type="date" value={form.tanggalAudit} onChange={f("tanggalAudit")} style={inp} />
            </div>
          </div>

          <div style={{
            background: C.bgAlt, border: `1px solid ${C.borderLight}`,
            borderRadius: 5, padding: "12px 14px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10, letterSpacing: "0.05em" }}>
              TIM AUDITOR
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                  LEAD AUDITOR *
                </label>
                <select value={form.leadAuditor} onChange={f("leadAuditor")} style={inp}>
                  <option value="">— Pilih —</option>
                  {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                  AUDITOR
                </label>
                <select value={form.auditor} onChange={f("auditor")} style={inp}>
                  <option value="">— Pilih —</option>
                  {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>
                OBSERVER (opsional)
              </label>
              <select value={form.observer} onChange={f("observer")} style={inp}>
                <option value="">— Tidak ada —</option>
                {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${C.borderLight}`,
          display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
          background: C.bgAlt,
        }}>
          <Btn variant="ghost" onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={() => onSave({ ...form, leadAuditor: parseInt(form.leadAuditor) || null, auditor: parseInt(form.auditor) || null, observer: parseInt(form.observer) || null })} disabled={!valid}>
            Buat Workspace
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Data Pengajuan ──────────────────────────────────────────────────────
function TabDataPengajuan({ reg, onUpdate, isAdmin }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...reg });
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const inp = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 4,
    padding: "6px 10px", fontSize: 13, fontFamily: font, outline: "none",
    color: C.text, background: C.bg, boxSizing: "border-box",
  };

  const save = () => {
    onUpdate({ ...form, leadAuditor: parseInt(form.leadAuditor) || null, auditor: parseInt(form.auditor) || null, observer: parseInt(form.observer) || null });
    setEditing(false);
  };

  if (editing && isAdmin) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
          <Btn variant="ghost" onClick={() => { setForm({ ...reg }); setEditing(false); }}>Batal</Btn>
          <Btn variant="primary" onClick={save}>Simpan Perubahan</Btn>
        </div>

        <SectionCard title="Identitas Registrasi">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>NO. DAFTAR</label>
              <input value={form.id} onChange={f("id")} style={{ ...inp, background: C.bgAlt, color: C.muted }} readOnly />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>TANGGAL DAFTAR</label>
              <input type="date" value={form.tanggalDaftar} onChange={f("tanggalDaftar")} style={inp} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Pelaku Usaha">
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>NAMA PELAKU USAHA</label>
            <input value={form.namaPU} onChange={f("namaPU")} style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>JENIS PRODUK</label>
              <select value={form.jenisProduk} onChange={f("jenisProduk")} style={inp}>
                {JENIS_PRODUK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>JENIS PENDAFTARAN</label>
              <select value={form.jenisPendaftaran} onChange={f("jenisPendaftaran")} style={inp}>
                <option>Pengajuan Baru</option><option>Perpanjangan</option><option>Perubahan</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>ALAMAT PRODUKSI</label>
            <input value={form.alamat} onChange={f("alamat")} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>AGAMA PEMILIK</label>
            <select value={form.agamaPemilik} onChange={f("agamaPemilik")} style={inp}>
              <option>Islam</option><option>Lainnya</option>
            </select>
          </div>
        </SectionCard>

        <SectionCard title="Jadwal Audit">
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>TANGGAL AUDIT</label>
            <input type="date" value={form.tanggalAudit} onChange={f("tanggalAudit")} style={{ ...inp, maxWidth: 220 }} />
          </div>
        </SectionCard>

        <SectionCard title="Tim Auditor">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>LEAD AUDITOR</label>
              <select value={form.leadAuditor || ""} onChange={f("leadAuditor")} style={inp}>
                <option value="">— Pilih —</option>
                {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>AUDITOR</label>
              <select value={form.auditor || ""} onChange={f("auditor")} style={inp}>
                <option value="">— Pilih —</option>
                {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>OBSERVER (opsional)</label>
            <select value={form.observer || ""} onChange={f("observer")} style={{ ...inp, maxWidth: 360 }}>
              <option value="">— Tidak ada —</option>
              {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
            </select>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn variant="secondary" small onClick={() => setEditing(true)}>✏ Edit Data</Btn>
        </div>
      )}

      <SectionCard title="Identitas Registrasi">
        <FieldRow label="No. Daftar" value={<span style={{ fontFamily: mono, fontSize: 12 }}>{reg.id}</span>} />
        <FieldRow label="Tanggal Daftar" value={fmtDate(reg.tanggalDaftar)} />
        <FieldRow label="Jenis Pendaftaran" value={reg.jenisPendaftaran} />
      </SectionCard>

      <SectionCard title="Pelaku Usaha">
        <FieldRow label="Nama PU" value={reg.namaPU} />
        <FieldRow label="Jenis Produk" value={reg.jenisProduk} />
        <FieldRow label="Alamat Produksi" value={reg.alamat} />
        <FieldRow label="Agama Pemilik" value={reg.agamaPemilik} />
      </SectionCard>

      <SectionCard title="Jadwal Audit">
        <FieldRow label="Tanggal Audit" value={reg.tanggalAudit ? fmtDate(reg.tanggalAudit) : <Badge color="gold">Belum dijadwalkan</Badge>} />
      </SectionCard>

      <SectionCard title="Tim Auditor">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.bgAlt }}>
              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: C.muted, fontSize: 11, borderBottom: `1px solid ${C.borderLight}` }}>PERAN</th>
              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: C.muted, fontSize: 11, borderBottom: `1px solid ${C.borderLight}` }}>NAMA</th>
              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: C.muted, fontSize: 11, borderBottom: `1px solid ${C.borderLight}` }}>NO. PENDAFTARAN</th>
            </tr>
          </thead>
          <tbody>
            {[
              { peran: "Lead Auditor", id: reg.leadAuditor },
              { peran: "Auditor", id: reg.auditor },
              reg.observer ? { peran: "Observer", id: reg.observer } : null,
            ].filter(Boolean).map((row, i) => {
              const a = AUDITORS.find(x => x.id === row.id);
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? C.bg : C.bgAlt }}>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${C.borderLight}` }}>
                    <Badge color={row.peran === "Lead Auditor" ? "blue" : "gray"}>{row.peran}</Badge>
                  </td>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${C.borderLight}`, fontWeight: 500 }}>{a?.nama || "—"}</td>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${C.borderLight}`, fontFamily: mono, fontSize: 11, color: C.muted }}>{a?.reg || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Pre-Audit Docs ──────────────────────────────────────────────────────
function TabPreAudit({ reg, isAdmin }) {
  const [generated, setGenerated] = useState({ st: false, spk: false, berkas: false });
  const docs = [
    {
      key: "st", label: "Surat Tugas (ST)",
      desc: "Surat penugasan auditor dari Direktur LPH untuk melaksanakan audit halal.",
      icon: "📋",
    },
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

  const canGenerate = reg.leadAuditor && reg.tanggalAudit;

  return (
    <div>
      {!canGenerate && (
        <div style={{
          background: C.goldLight, border: `1px dashed ${C.gold}`,
          borderRadius: 5, padding: "10px 14px", marginBottom: 16,
          fontSize: 12, color: C.gold, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>⚠</span>
          <span>Lengkapi <strong>Lead Auditor</strong> dan <strong>Tanggal Audit</strong> di tab Data Pengajuan sebelum membuat dokumen pre-audit.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {docs.map(doc => (
          <div key={doc.key} style={{
            border: `1px solid ${C.borderLight}`, borderRadius: 6,
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
            background: generated[doc.key] ? C.greenLight : C.bg,
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{doc.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{doc.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{doc.desc}</div>
              {generated[doc.key] && (
                <div style={{ marginTop: 6 }}>
                  <Badge color="green">✓ Dibuat {new Date().toLocaleDateString("id-ID")}</Badge>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {generated[doc.key] && (
                <Btn variant="secondary" small onClick={() => alert(`Download ${doc.label}`)}>
                  ⬇ Unduh
                </Btn>
              )}
              {isAdmin && (
                <Btn
                  variant={generated[doc.key] ? "ghost" : "primary"}
                  small
                  disabled={!canGenerate}
                  onClick={() => setGenerated(p => ({ ...p, [doc.key]: true }))}
                >
                  {generated[doc.key] ? "↻ Buat Ulang" : "Buat Dokumen"}
                </Btn>
              )}
              {!isAdmin && !generated[doc.key] && (
                <span style={{ fontSize: 11, color: C.faint, fontStyle: "italic" }}>Belum dibuat</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 20, padding: "12px 14px",
        background: C.bgAlt, borderRadius: 5, border: `1px solid ${C.borderLight}`,
        fontSize: 11, color: C.muted,
      }}>
        <strong style={{ color: C.text }}>Catatan:</strong> Dokumen dengan tanda tangan akan diupload setelah ditandatangani.
        Slot upload tersedia di tab <strong>Dokumen Pendukung</strong>.
      </div>
    </div>
  );
}

// ─── Tab: Laporan Audit ───────────────────────────────────────────────────────
function TabLaporan({ reg, isAdmin }) {
  const [mode, setMode] = useState("draft");
  const modes = [
    { key: "draft", label: "Draft", desc: "Pre-audit · bahan & profil, kriteria SJPH kosong" },
    { key: "ringkasan", label: "Ringkasan Pasca Audit", desc: "Temuan audit · kriteria SJPH dapat diisi" },
    { key: "final", label: "Final / LHA", desc: "Laporan akhir · siap diupload ke SIHALAL" },
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {modes.map(m => (
          <div
            key={m.key}
            onClick={() => !isAdmin && setMode(m.key)}
            style={{
              flex: 1, minWidth: 160,
              border: `2px solid ${mode === m.key ? C.blue : C.borderLight}`,
              borderRadius: 6, padding: "10px 14px",
              background: mode === m.key ? C.blueLight : C.bg,
              cursor: isAdmin ? "default" : "pointer",
              transition: "all 0.15s",
              opacity: isAdmin && m.key !== "final" ? 0.7 : 1,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 12, color: mode === m.key ? C.blue : C.text, marginBottom: 3 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>{m.desc}</div>
          </div>
        ))}
      </div>

      <div style={{
        border: `1px solid ${C.borderLight}`, borderRadius: 6,
        padding: "20px", background: C.bgAlt, textAlign: "center",
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
          Laporan Audit — {reg.namaPU}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          {reg.id} · Mode: {modes.find(m => m.key === mode)?.label}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {!isAdmin && (
            <Btn variant="primary" onClick={() => alert("Buka editor laporan")}>
              ✏ Buka Editor Laporan
            </Btn>
          )}
          <Btn variant="secondary" onClick={() => alert("Download PDF")}>
            ⬇ Unduh PDF
          </Btn>
        </div>
        {isAdmin && (
          <p style={{ marginTop: 12, fontSize: 11, color: C.muted, fontStyle: "italic" }}>
            Admin hanya dapat mengunduh laporan. Pengeditan dilakukan oleh auditor.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Dokumentasi ────────────────────────────────────────────────────────
function TabDokumentasi({ isAdmin }) {
  const [photos, setPhotos] = useState([
    { id: 1, name: "Dapur produksi — tampak depan", date: "16/04/2026", thumb: null },
    { id: 2, name: "Label bahan Anchor Butter", date: "16/04/2026", thumb: null },
    { id: 3, name: "Sertifikat Penyelia Halal", date: "16/04/2026", thumb: null },
  ]);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const fileRef = useRef();

  return (
    <div>
      <div style={{
        background: C.blueLight, border: `1px solid #b0cce8`,
        borderRadius: 5, padding: "10px 14px", marginBottom: 16,
        fontSize: 12, color: C.blue,
      }}>
        📱 <strong>Tip mobile:</strong> Gunakan kamera untuk foto langsung. jscanify akan otomatis meluruskan perspektif dokumen.
        Tesseract.js membaca nomor sertifikat dari foto kemasan.
      </div>

      {!isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Btn variant="primary" onClick={() => fileRef.current?.click()}>
            📷 Ambil Foto / Upload
          </Btn>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ display: "none" }}
            onChange={e => {
              if (e.target.files[0]) {
                const name = e.target.files[0].name.replace(/\.[^.]+$/, "");
                setPhotos(p => [...p, { id: Date.now(), name, date: new Date().toLocaleDateString("id-ID"), thumb: null }]);
              }
            }} />
          <Btn variant="secondary" onClick={() => fileRef.current?.click()}>
            🔍 Scan Dokumen (jscanify)
          </Btn>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {photos.map(p => (
          <div key={p.id} style={{
            border: `1px solid ${C.borderLight}`, borderRadius: 6,
            overflow: "hidden", background: C.bg,
          }}>
            <div style={{
              height: 100, background: C.bgAlt,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderBottom: `1px solid ${C.borderLight}`, fontSize: 28,
            }}>📷</div>
            <div style={{ padding: "8px 10px" }}>
              {renaming === p.id ? (
                <div>
                  <input
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    autoFocus
                    style={{
                      width: "100%", border: `1px solid ${C.blue}`, borderRadius: 3,
                      padding: "3px 6px", fontSize: 11, fontFamily: font,
                      marginBottom: 6, boxSizing: "border-box",
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        setPhotos(pp => pp.map(x => x.id === p.id ? { ...x, name: renameVal } : x));
                        setRenaming(null);
                      }
                      if (e.key === "Escape") setRenaming(null);
                    }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn small variant="primary" onClick={() => {
                      setPhotos(pp => pp.map(x => x.id === p.id ? { ...x, name: renameVal } : x));
                      setRenaming(null);
                    }}>✓</Btn>
                    <Btn small variant="ghost" onClick={() => setRenaming(null)}>✕</Btn>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2, wordBreak: "break-word" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: C.faint, marginBottom: 6 }}>{p.date}</div>
                  {!isAdmin && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn small variant="ghost" onClick={() => { setRenaming(p.id); setRenameVal(p.name); }}>✏</Btn>
                      <Btn small variant="ghost" onClick={() => setPhotos(pp => pp.filter(x => x.id !== p.id))}>🗑</Btn>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Dokumen Pendukung ───────────────────────────────────────────────────
function TabDokumenPendukung({ isAdmin }) {
  const [docs, setDocs] = useState([
    { id: 1, label: "Sertifikat Penyelia Halal", filename: "sertifikat-ph-uly-fitria.pdf", date: "16/04/2026", size: "284 KB" },
    { id: 2, label: "Hasil Uji Air (PDAM)", filename: "uji-air-apr2026.pdf", date: "16/04/2026", size: "512 KB" },
  ]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const fileRef = useRef();

  return (
    <div>
      <div style={{
        background: C.blueLight, border: `1px solid #b0cce8`,
        borderRadius: 5, padding: "10px 14px", marginBottom: 16,
        fontSize: 12, color: C.blue,
      }}>
        📄 Upload sertifikat penyelia halal, hasil uji lab, nota pembelian bahan, denah lokasi, diagram alir produksi, dan dokumen pendukung lainnya.
        Tesseract.js tersedia untuk OCR dokumen scan.
      </div>

      {!isAdmin && (
        <div style={{ marginBottom: 16 }}>
          {adding ? (
            <div style={{
              border: `1px solid ${C.blue}`, borderRadius: 5,
              padding: "12px 14px", background: C.blueLight, marginBottom: 8,
            }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>LABEL DOKUMEN</label>
                <input
                  value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  placeholder="e.g. Sertifikat Halal Anchor Butter"
                  autoFocus
                  style={{
                    width: "100%", border: `1px solid ${C.border}`, borderRadius: 4,
                    padding: "6px 10px", fontSize: 12, fontFamily: font,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="primary" small onClick={() => {
                  if (newLabel.trim()) {
                    setDocs(p => [...p, { id: Date.now(), label: newLabel.trim(), filename: "dokumen-baru.pdf", date: new Date().toLocaleDateString("id-ID"), size: "—" }]);
                    setNewLabel(""); setAdding(false);
                  }
                }}>Upload & Simpan</Btn>
                <Btn variant="ghost" small onClick={() => { setAdding(false); setNewLabel(""); }}>Batal</Btn>
              </div>
            </div>
          ) : (
            <Btn variant="primary" onClick={() => setAdding(true)}>+ Upload Dokumen</Btn>
          )}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.bgAlt }}>
            <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>LABEL</th>
            <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>FILE</th>
            <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>TANGGAL</th>
            <th style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>UKURAN</th>
            <th style={{ padding: "7px 10px", textAlign: "center", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>AKSI</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d, i) => (
            <tr key={d.id} style={{ background: i % 2 === 0 ? C.bg : C.bgAlt }}>
              <td style={{ padding: "8px 10px", fontWeight: 500, borderBottom: `1px solid ${C.borderLight}` }}>{d.label}</td>
              <td style={{ padding: "8px 10px", fontFamily: mono, fontSize: 11, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{d.filename}</td>
              <td style={{ padding: "8px 10px", color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{d.date}</td>
              <td style={{ padding: "8px 10px", color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>{d.size}</td>
              <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}` }}>
                <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                  <Btn small variant="ghost" onClick={() => alert(`Download ${d.filename}`)}>⬇</Btn>
                  {!isAdmin && (
                    <Btn small variant="ghost" onClick={() => setDocs(p => p.filter(x => x.id !== d.id))}>🗑</Btn>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {docs.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: C.faint, fontSize: 12 }}>
                Belum ada dokumen pendukung
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Workspace (tabbed view for one registration) ────────────────────────────
const TABS = [
  { key: "data", label: "Data Pengajuan" },
  { key: "preaudit", label: "Dokumen Pre-Audit" },
  { key: "laporan", label: "Laporan Audit" },
  { key: "dokumentasi", label: "Dokumentasi" },
  { key: "pendukung", label: "Dokumen Pendukung" },
];

function Workspace({ reg, onUpdate, onBack, role }) {
  const [activeTab, setActiveTab] = useState("data");
  const isAdmin = role === "admin";

  return (
    <div>
      {/* Back + title */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.blue, fontSize: 13, fontFamily: font, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 4, padding: "4px 0",
        }}>← Kembali</button>
        <span style={{ color: C.faint }}>·</span>
        <span style={{ fontSize: 13, color: C.muted }}>Workspace</span>
      </div>

      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{reg.namaPU}</h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: mono }}>{reg.id}</div>
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

      {/* Tab content */}
      {activeTab === "data" && <TabDataPengajuan reg={reg} onUpdate={onUpdate} isAdmin={isAdmin} />}
      {activeTab === "preaudit" && <TabPreAudit reg={reg} isAdmin={isAdmin} />}
      {activeTab === "laporan" && <TabLaporan reg={reg} isAdmin={isAdmin} />}
      {activeTab === "dokumentasi" && <TabDokumentasi isAdmin={isAdmin} />}
      {activeTab === "pendukung" && <TabDokumenPendukung isAdmin={isAdmin} />}
    </div>
  );
}

// ─── Registration List ────────────────────────────────────────────────────────
function RegList({ regs, onOpen, onNew, onDelete, role }) {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const isAdmin = role === "admin";

  const filtered = regs.filter(r =>
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.namaPU.toLowerCase().includes(search.toLowerCase()) ||
    r.jenisProduk.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {deleteTarget && (
        <DeleteModal
          reg={deleteTarget}
          onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Daftar Registrasi</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{regs.length} registrasi aktif di workspace</p>
        </div>
        {isAdmin && (
          <Btn variant="primary" onClick={onNew}>+ Registrasi Baru</Btn>
        )}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          color: C.faint, fontSize: 14,
        }}>🔍</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nomor daftar, nama PU, jenis produk..."
          style={{
            width: "100%", border: `1px solid ${C.border}`, borderRadius: 5,
            padding: "8px 12px 8px 32px", fontSize: 13, fontFamily: font,
            outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${C.borderLight}`, borderRadius: 6, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.blue }}>
              <th style={{ padding: "9px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>NO. DAFTAR</th>
              <th style={{ padding: "9px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>NAMA PELAKU USAHA</th>
              <th style={{ padding: "9px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>JENIS PRODUK</th>
              <th style={{ padding: "9px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>LEAD AUDITOR</th>
              <th style={{ padding: "9px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>TGL AUDIT</th>
              <th style={{ padding: "9px 14px", textAlign: "center", color: "#fff", fontSize: 11, fontWeight: 600 }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: C.faint, fontSize: 13 }}>
                  {search ? "Tidak ada hasil pencarian." : "Belum ada registrasi."}
                </td>
              </tr>
            )}
            {filtered.map((reg, i) => (
              <tr key={reg.id}
                style={{ background: i % 2 === 0 ? C.bg : C.bgAlt, cursor: "pointer" }}
                onClick={() => onOpen(reg.id)}
              >
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}`, fontFamily: mono, fontSize: 12 }}>
                  {reg.id}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}`, fontWeight: 500 }}>
                  {reg.namaPU}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}`, fontSize: 12, color: C.muted, maxWidth: 220 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {reg.jenisProduk}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}`, fontSize: 12, color: C.muted }}>
                  {auditorName(reg.leadAuditor)}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}`, fontSize: 12 }}>
                  {reg.tanggalAudit
                    ? <span style={{ color: C.text }}>{fmtDate(reg.tanggalAudit)}</span>
                    : <Badge color="gold">Belum</Badge>}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}`, textAlign: "center" }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <Btn small variant="secondary" onClick={() => onOpen(reg.id)}>→ Buka</Btn>
                    {isAdmin && (
                      <Btn small variant="ghost" onClick={() => setDeleteTarget(reg)}>🗑</Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function HARSApp() {
  const [role, setRole] = useState("admin");
  const [regs, setRegs] = useState(INITIAL_REGISTRATIONS);
  const [view, setView] = useState("list"); // "list" | "workspace"
  const [activeRegId, setActiveRegId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const activeReg = regs.find(r => r.id === activeRegId);

  const openWorkspace = id => { setActiveRegId(id); setView("workspace"); };
  const backToList = () => { setView("list"); setActiveRegId(null); };
  const handleNew = data => {
    setRegs(p => [...p, data]);
    setShowNew(false);
    openWorkspace(data.id);
  };
  const handleUpdate = updated => setRegs(p => p.map(r => r.id === updated.id ? updated : r));
  const handleDelete = id => { setRegs(p => p.filter(r => r.id !== id)); if (activeRegId === id) backToList(); };

  return (
    <div style={{ fontFamily: font, background: C.bgPage, minHeight: "100vh", fontSize: 13 }}>
      {showNew && <NewRegModal onSave={handleNew} onClose={() => setShowNew(false)} />}

      {/* Top nav */}
      <nav style={{
        background: C.blue, color: "#fff", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 48, position: "sticky", top: 0, zIndex: 200,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>HARS</span>
          <span style={{ opacity: 0.4, fontSize: 16 }}>|</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>LPH UIN Jakarta · Halal Audit Report System</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Role switcher — dev only, would be auth in production */}
          <div style={{
            display: "flex", background: "rgba(255,255,255,0.12)", borderRadius: 5, overflow: "hidden",
          }}>
            {["admin", "auditor"].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{
                background: role === r ? "rgba(255,255,255,0.22)" : "none",
                border: "none", color: role === r ? "#fff" : "rgba(255,255,255,0.65)",
                padding: "5px 12px", fontSize: 11, fontFamily: font, cursor: "pointer",
                fontWeight: 600, textTransform: "capitalize", letterSpacing: "0.03em",
              }}>{r}</button>
            ))}
          </div>
          <div style={{
            background: "rgba(255,255,255,0.15)", borderRadius: 20,
            padding: "4px 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
          }}>
            {role === "admin" ? "👤 Admin LPH" : "🔍 Auditor"}
          </div>
        </div>
      </nav>

      {/* Main */}
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 24px" }}>
        {view === "list" ? (
          <RegList
            regs={regs}
            onOpen={openWorkspace}
            onNew={() => setShowNew(true)}
            onDelete={handleDelete}
            role={role}
          />
        ) : activeReg ? (
          <Workspace
            reg={activeReg}
            onUpdate={handleUpdate}
            onBack={backToList}
            role={role}
          />
        ) : null}
      </div>
    </div>
  );
}
