import { useState, useRef, useEffect, useCallback } from "react";

// ─── Design tokens (mirrors laporan-audit-halal.html) ───────────────────────
const T = {
  blue: "#1565c0",
  blueMid: "#1976d2",
  blueLight: "#e3f0fb",
  gold: "#b8860b",
  goldLight: "#fdf8e8",
  red: "#c0392b",
  text: "#1a1a1a",
  muted: "#555",
  faint: "#888",
  border: "#d0d0d0",
  borderLight: "#e8e8e8",
  bg: "#fff",
  bgAlt: "#f7f7f5",
};

// ─── Tiny helpers ────────────────────────────────────────────────────────────
function Badge({ variant, children }) {
  const styles = {
    sesuai: { background: T.blueLight, color: T.blue },
    positif: { background: "#e8f0fb", color: "#1a4a8a" },
    baru: { background: "#fff3e0", color: "#b8540a" },
    perlu: { background: "#fce4ec", color: "#c62828" },
    kemasan: { background: "#f3e5f5", color: "#6a1b9a" },
    cleaning: { background: "#e8f5e9", color: "#1b5e20" },
  };
  const s = styles[variant] || styles.sesuai;
  return (
    <span style={{
      ...s,
      fontSize: 10, fontWeight: 600, padding: "2px 6px",
      borderRadius: 3, display: "inline-block", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function IconBtn({ title, onClick, color, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (color === "red" ? "#fce4ec" : T.blueLight) : "transparent",
        border: "none", borderRadius: 4, cursor: "pointer",
        color: hov ? (color === "red" ? T.red : T.blue) : T.muted,
        padding: "3px 5px", fontSize: 13, lineHeight: 1,
        transition: "all 0.15s", display: "inline-flex", alignItems: "center",
      }}
    >{children}</button>
  );
}

// ─── BPJPH Search Modal ──────────────────────────────────────────────────────
// In production this hits https://api.halal.go.id — here we simulate realistic data
async function fakeBPJPHSearch(query) {
  await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  const DB = [
    { id: "ID00410000476250922", nama: "ANCHOR Unsalted Butter", produsen: "PT. Fonterra Brands Indonesia", tgl: "2022-10-13", exp: "2025-10-13", jenis: "Bahan" },
    { id: "ID00410000002160320", nama: "ANCHOR FP Keju Cheddar Olahan", produsen: "PT. Fonterra Brands Indonesia", tgl: "2025-08-05", exp: "2028-08-05", jenis: "Bahan" },
    { id: "ID00410000500550822", nama: "Barry Callebaut Dark Chocolate", produsen: "Barry Callebaut Chocolate Asia Pacific Pte Ltd", tgl: "2022-10-27", exp: "2025-10-27", jenis: "Bahan" },
    { id: "ID00410000500550823", nama: "Barry Callebaut White Chocolate", produsen: "Barry Callebaut Chocolate Asia Pacific Pte Ltd", tgl: "2022-10-27", exp: "2025-10-27", jenis: "Bahan" },
    { id: "ID00410000201600321", nama: "Gulaku Premium", produsen: "PT Sweet Indolampung", tgl: "2021-06-17", exp: "2024-06-17", jenis: "Bahan" },
    { id: "ID00410000090970121", nama: "Tepung Terigu Segitiga Biru", produsen: "PT. Indofood Sukses Makmur Tbk Divisi Bogasari", tgl: "2021-03-25", exp: "2024-03-25", jenis: "Bahan" },
    { id: "ID00410000090970122", nama: "Kunci Biru (Tepung Terigu)", produsen: "PT. Indofood Sukses Makmur Tbk Divisi Bogasari", tgl: "2021-03-25", exp: "2024-03-25", jenis: "Bahan" },
    { id: "ID31110021166460325", nama: "Whipping Cream Millac Gold", produsen: "Cv. Permata Tunggal", tgl: "2025-03-15", exp: "2028-03-15", jenis: "Bahan" },
    { id: "ID00410000264060622", nama: "Cocoa Powder BENSDORP", produsen: "Papandayan Cocoa Industries", tgl: "2022-07-21", exp: "2025-07-21", jenis: "Bahan" },
    { id: "ID00210000256160322", nama: "Maizenaku (Tepung Maizena)", produsen: "PT. Ega Multi Cipta", tgl: "2022-06-16", exp: "2025-06-16", jenis: "Bahan" },
    { id: "ID36410000227471220", nama: "Tetangga Blend", produsen: "PT Berangan Ragam Rasa", tgl: "2021-05-21", exp: "2024-05-21", jenis: "Bahan" },
    { id: "ID00410000476720822", nama: "Baking Paper Dragon Pack", produsen: "PT. Dragon Pack", tgl: "2022-10-13", exp: "2025-10-13", jenis: "Kemasan" },
    { id: "ID36110028397440925", nama: "Soft Box Fuji Pratama", produsen: "PT. Fuji Pratama Global", tgl: "2025-09-20", exp: "2028-09-20", jenis: "Kemasan" },
    { id: "ID00410000008400120", nama: "SUNLIGHT Cairan Pencuci Piring", produsen: "PT. Unilever Indonesia Tbk", tgl: "2024-06-03", exp: "2027-06-03", jenis: "Cleaning Agent" },
  ];
  return DB.filter(r =>
    r.nama.toLowerCase().includes(lower) ||
    r.produsen.toLowerCase().includes(lower) ||
    r.id.toLowerCase().includes(lower)
  );
}

function formatTanggal(iso) {
  if (!iso) return "—";
  const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function buildTemuan(item) {
  return `SH BPJPH ${item.id}, terbit tanggal ${formatTanggal(item.tgl)}, dari Produsen ${item.produsen}`;
}

function isExpired(exp) {
  if (!exp) return false;
  return new Date(exp) < new Date();
}

function BPJPHSearchModal({ onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await fakeBPJPHSearch(query);
    setResults(res);
    setLoading(false);
  }, [query]);

  const handleKey = (e) => {
    if (e.key === "Enter") search();
    if (e.key === "Escape") onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.bg, borderRadius: 8, width: "100%", maxWidth: 560,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: `1px solid ${T.border}`,
        fontFamily: "'IBM Plex Sans', sans-serif",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          background: T.blue, color: "#fff", padding: "12px 16px",
          borderRadius: "8px 8px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>🔍 Cari Bahan — Database BPJPH</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nama bahan, produsen, atau nomor SH..."
            style={{
              flex: 1, border: `1px solid ${T.border}`, borderRadius: 5,
              padding: "7px 10px", fontSize: 13, fontFamily: "inherit",
              outline: "none", color: T.text,
            }}
            onFocus={e => e.target.style.borderColor = T.blue}
            onBlur={e => e.target.style.borderColor = T.border}
          />
          <button onClick={search} style={{
            background: T.blue, color: "#fff", border: "none", borderRadius: 5,
            padding: "7px 16px", fontSize: 13, fontWeight: 600,
            fontFamily: "inherit", cursor: "pointer",
          }}>Cari</button>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 13 }}>
              Mengambil data BPJPH…
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 13 }}>
              Tidak ditemukan. Coba nama lain atau tambah manual.
            </div>
          )}
          {!loading && results.map((r, i) => {
            const expired = isExpired(r.exp);
            return (
              <div key={i} style={{
                padding: "10px 16px",
                borderBottom: `1px solid ${T.borderLight}`,
                display: "flex", alignItems: "flex-start", gap: 12,
                background: i % 2 === 0 ? T.bg : T.bgAlt,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: T.text, marginBottom: 2 }}>{r.nama}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>{r.produsen}</div>
                  <div style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: T.blue }}>
                    {r.id}
                  </div>
                  <div style={{ fontSize: 10, color: expired ? T.red : "#2e7d32", marginTop: 2 }}>
                    {expired ? "⚠ Kadaluarsa " : "✓ Berlaku s/d "}{formatTanggal(r.exp)}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Badge variant={r.jenis === "Kemasan" ? "kemasan" : r.jenis === "Cleaning Agent" ? "cleaning" : "sesuai"}>
                      {r.jenis}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => onSelect(r)}
                  title="Tambah ke tabel"
                  style={{
                    background: T.blue, color: "#fff", border: "none",
                    borderRadius: 5, padding: "6px 12px", fontSize: 12,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    flexShrink: 0, alignSelf: "center",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  ← Tambah
                </button>
              </div>
            );
          })}
          {!loading && !searched && (
            <div style={{ padding: 20, textAlign: "center", color: T.faint, fontSize: 12 }}>
              Ketik nama bahan, produsen, atau nomor SH kemudian tekan Enter atau klik Cari.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add Row Type Picker ──────────────────────────────────────────────────────
function AddRowPicker({ onChoose, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999, padding: 16,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.bg, borderRadius: 8, width: "100%", maxWidth: 380,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: `1px solid ${T.border}`,
        fontFamily: "'IBM Plex Sans', sans-serif", overflow: "hidden",
      }}>
        <div style={{ background: T.blue, color: "#fff", padding: "11px 16px", fontWeight: 600, fontSize: 13 }}>
          Tambah Bahan — Pilih Jenis
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => onChoose("positif")} style={{
            background: "#e8f0fb", border: `1px solid #b0c8ef`, borderRadius: 6,
            padding: "12px 16px", cursor: "pointer", textAlign: "left",
            fontFamily: "inherit", transition: "background 0.15s",
          }}
            onMouseEnter={e => e.target.style.background = T.blueLight}
            onMouseLeave={e => e.target.style.background = "#e8f0fb"}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: T.blue, marginBottom: 3 }}>✅ Positif List (Tidak Diragukan)</div>
            <div style={{ fontSize: 11, color: T.muted }}>Air, telur, buah, sayuran — tidak perlu sertifikat halal</div>
          </button>
          <button onClick={() => onChoose("bersertifikat")} style={{
            background: T.goldLight, border: `1px solid #e0c860`, borderRadius: 6,
            padding: "12px 16px", cursor: "pointer", textAlign: "left",
            fontFamily: "inherit", transition: "background 0.15s",
          }}
            onMouseEnter={e => e.target.style.background = "#fef5d0"}
            onMouseLeave={e => e.target.style.background = T.goldLight}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: T.gold, marginBottom: 3 }}>🔖 Bersertifikat (Diragukan)</div>
            <div style={{ fontSize: 11, color: T.muted }}>Bahan yang memerlukan sertifikat halal BPJPH — cari di database</div>
          </button>
          <button onClick={() => onChoose("manual")} style={{
            background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 6,
            padding: "12px 16px", cursor: "pointer", textAlign: "left",
            fontFamily: "inherit", transition: "background 0.15s",
          }}
            onMouseEnter={e => e.target.style.background = "#ececea"}
            onMouseLeave={e => e.target.style.background = T.bgAlt}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 3 }}>✏️ Input Manual</div>
            <div style={{ fontSize: 11, color: T.muted }}>Kemasan, cleaning agent, atau bahan dengan sertifikat luar negeri</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual Row Editor ────────────────────────────────────────────────────────
function ManualRowForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { nama: "", jenis: "Bahan", temuan: "", ket: "" });
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const inputStyle = {
    width: "100%", border: `1px solid ${T.border}`, borderRadius: 4,
    padding: "5px 8px", fontSize: 12, fontFamily: "inherit",
    color: T.text, background: "#fff",
  };
  return (
    <tr style={{ background: T.blueLight }}>
      <td colSpan={6} style={{ padding: "10px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: T.muted, display: "block", marginBottom: 2 }}>NAMA / MEREK BAHAN</label>
            <input value={form.nama} onChange={f("nama")} style={inputStyle} placeholder="Nama dan merek bahan..." autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: T.muted, display: "block", marginBottom: 2 }}>JENIS</label>
            <select value={form.jenis} onChange={f("jenis")} style={inputStyle}>
              <option>Bahan</option>
              <option>Kemasan</option>
              <option>Cleaning Agent</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: T.muted, display: "block", marginBottom: 2 }}>TEMUAN</label>
          <textarea value={form.temuan} onChange={f("temuan")} rows={2}
            style={{ ...inputStyle, resize: "vertical", minHeight: 44 }}
            placeholder="SH BPJPH ID..., terbit tanggal ..., dari Produsen ..." />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: T.muted, display: "block", marginBottom: 2 }}>KETERANGAN</label>
          <input value={form.ket} onChange={f("ket")} style={inputStyle} placeholder="Sesuai / Perlu verifikasi / —" />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onSave(form)} style={{
            background: T.blue, color: "#fff", border: "none", borderRadius: 4,
            padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Simpan</button>
          <button onClick={onCancel} style={{
            background: "transparent", color: T.muted, border: `1px solid ${T.border}`,
            borderRadius: 4, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>Batal</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Bahan Table ─────────────────────────────────────────────────────────────
const INITIAL_BAHAN = [
  { id: 1, nama: "ANCHOR Unsalted Butter", jenis: "Bahan", temuan: "SH BPJPH ID00410000476250922, terbit tanggal 13 Oktober 2022, dari Produsen PT. Fonterra Brands Indonesia", ket: "Sesuai" },
  { id: 2, nama: "Barry Callebaut Dark Chocolate Products", jenis: "Bahan", temuan: "SH BPJPH ID00410000500550822, terbit tanggal 27 Oktober 2022, dari Produsen Barry Callebaut Chocolate Asia Pacific Pte Ltd", ket: "Sesuai" },
  { id: 3, nama: "Gulaku Premium", jenis: "Bahan", temuan: "SH BPJPH ID00410000201600321, terbit tanggal 17 Juni 2021, dari Produsen PT Sweet Indolampung", ket: "Sesuai" },
  { id: 4, nama: "Tepung Terigu Segitiga Biru", jenis: "Bahan", temuan: "SH BPJPH ID00410000090970121, terbit tanggal 25 Maret 2021, dari Produsen PT. Indofood Sukses Makmur Tbk Divisi Bogasari", ket: "Sesuai" },
  { id: 5, nama: "Air", jenis: "Bahan", temuan: "positif", ket: "" },
  { id: 6, nama: "Telur Ayam", jenis: "Bahan", temuan: "positif", ket: "" },
  { id: 7, nama: "Pisang", jenis: "Bahan", temuan: "positif", ket: "" },
  { id: 8, nama: "Soft Box", jenis: "Kemasan", temuan: "SH BPJPH ID36110028397440925, terbit tanggal 20 September 2025, dari Produsen PT. Fuji Pratama Global", ket: "" },
  { id: 9, nama: "SUNLIGHT Cairan Pencuci Piring", jenis: "Cleaning Agent", temuan: "SH BPJPH ID00410000008400120, terbit tanggal 03 Juni 2024, dari Produsen PT. Unilever Indonesia Tbk", ket: "" },
  { id: 10, nama: "Elle & Vire Whipping Cream", jenis: "Bahan", temuan: "", ket: "Perlu verifikasi", isNew: true },
];

let nextId = 100;

function BahanTable() {
  const [rows, setRows] = useState(INITIAL_BAHAN);
  const [editingId, setEditingId] = useState(null);
  const [showPicker, setShowPicker] = useState(null); // null | "add" | "edit:{id}"
  const [showSearch, setShowSearch] = useState(false);
  const [pendingEditId, setPendingEditId] = useState(null); // id being replaced via search

  const deleteRow = (id) => setRows(r => r.filter(x => x.id !== id));

  const handlePickerChoice = (choice, editId = null) => {
    setShowPicker(null);
    if (choice === "positif") {
      const name = window.prompt("Nama bahan positif list:");
      if (!name) return;
      const newRow = { id: ++nextId, nama: name, jenis: "Bahan", temuan: "positif", ket: "" };
      if (editId) {
        setRows(r => r.map(x => x.id === editId ? newRow : x));
      } else {
        setRows(r => [...r, newRow]);
      }
    } else if (choice === "bersertifikat") {
      setPendingEditId(editId || null);
      setShowSearch(true);
    } else if (choice === "manual") {
      setEditingId(editId || "new");
    }
  };

  const handleSearchSelect = (item) => {
    const newRow = {
      id: pendingEditId || ++nextId,
      nama: item.nama,
      jenis: item.jenis,
      temuan: buildTemuan(item),
      ket: isExpired(item.exp) ? "Perlu verifikasi" : "Sesuai",
      isNew: !pendingEditId,
    };
    if (pendingEditId) {
      setRows(r => r.map(x => x.id === pendingEditId ? newRow : x));
    } else {
      setRows(r => [...r, newRow]);
    }
    setShowSearch(false);
    setPendingEditId(null);
  };

  const handleManualSave = (form) => {
    if (editingId === "new") {
      setRows(r => [...r, { id: ++nextId, ...form, isNew: true }]);
    } else {
      setRows(r => r.map(x => x.id === editingId ? { ...x, ...form } : x));
    }
    setEditingId(null);
  };

  const thStyle = {
    background: T.blue, color: "#fff", fontWeight: 500, fontSize: 11,
    padding: "7px 8px", textAlign: "left",
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {showPicker && (
        <AddRowPicker
          onChoose={(c) => handlePickerChoice(c, showPicker === "add" ? null : parseInt(showPicker.split(":")[1]))}
          onClose={() => setShowPicker(null)}
        />
      )}
      {showSearch && (
        <BPJPHSearchModal
          onClose={() => { setShowSearch(false); setPendingEditId(null); }}
          onSelect={handleSearchSelect}
        />
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <colgroup>
            <col style={{ width: 32 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 76 }} />
            <col style={{ width: 70 }} />
            <col />
            <col style={{ width: 90 }} />
            <col style={{ width: 68 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>No</th>
              <th style={thStyle}>Nama dan Merek Bahan</th>
              <th style={thStyle}>Jenis</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Diragukan</th>
              <th style={thStyle}>Temuan</th>
              <th style={thStyle}>Keterangan</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isPositif = row.temuan === "positif";
              const isEmpty = !row.temuan && !isPositif;

              if (editingId === row.id) {
                return <ManualRowForm key={row.id} initial={row} onSave={handleManualSave} onCancel={() => setEditingId(null)} />;
              }

              return (
                <tr key={row.id} style={{ background: i % 2 === 0 ? T.bg : T.bgAlt }}>
                  <td style={{ padding: "5px 8px", textAlign: "center", color: T.faint, fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: "5px 8px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: 500, fontSize: 12, color: T.text }}>{row.nama}</span>
                    {row.isNew && <> <Badge variant="baru">Baru</Badge></>}
                  </td>
                  <td style={{ padding: "5px 8px", verticalAlign: "top" }}>
                    <Badge variant={row.jenis === "Kemasan" ? "kemasan" : row.jenis === "Cleaning Agent" ? "cleaning" : "sesuai"}>
                      {row.jenis}
                    </Badge>
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "center", color: T.blueMid, fontSize: 14, verticalAlign: "top" }}>
                    {!isPositif ? "✓" : ""}
                  </td>
                  <td style={{ padding: "5px 8px", verticalAlign: "top" }}>
                    {isPositif ? (
                      <span style={{ fontStyle: "italic", color: "#1a5276", fontSize: 11.5 }}>Positif list</span>
                    ) : isEmpty ? (
                      <span style={{ color: T.faint, fontSize: 11 }}>—</span>
                    ) : (
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, lineHeight: 1.4, color: T.text }}>{row.temuan}</span>
                    )}
                  </td>
                  <td style={{ padding: "5px 8px", verticalAlign: "top" }}>
                    {row.ket === "Sesuai" ? <Badge variant="sesuai">Sesuai</Badge>
                      : isPositif ? <Badge variant="positif">Positif List</Badge>
                      : row.ket === "Perlu verifikasi" ? <Badge variant="perlu">Perlu verifikasi</Badge>
                      : <span style={{ fontSize: 11, color: T.muted }}>{row.ket || "—"}</span>}
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "center", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    <IconBtn title="Edit baris" onClick={() => setShowPicker(`edit:${row.id}`)}>✏️</IconBtn>
                    <IconBtn title="Hapus baris" color="red" onClick={() => {
                      if (window.confirm(`Hapus "${row.nama}"?`)) deleteRow(row.id);
                    }}>🗑</IconBtn>
                  </td>
                </tr>
              );
            })}

            {editingId === "new" && (
              <ManualRowForm onSave={handleManualSave} onCancel={() => setEditingId(null)} />
            )}

            {/* Add row button */}
            <tr>
              <td colSpan={7} style={{ padding: "6px 8px", borderTop: `1px dashed ${T.border}` }}>
                <button
                  onClick={() => setShowPicker("add")}
                  style={{
                    background: "transparent", border: `1px dashed ${T.blue}`,
                    borderRadius: 4, padding: "5px 14px", fontSize: 12,
                    color: T.blue, cursor: "pointer", fontFamily: "inherit",
                    fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.blueLight}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  + Tambah Bahan
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Kriteria SJPH Table ──────────────────────────────────────────────────────
const INITIAL_KRITERIA = [
  {
    id: 1, kriteria: "Komitmen dan Tanggung Jawab",
    catatan: "Tidak ada kelemahan\n\nBukti implementasi:\n• Kebijakan halal perusahaan telah ditetapkan pada tanggal [isi]\n• Sosialisasi kebijakan halal kepada stakeholder melalui pelatihan internal\n• Penyelia halal: Uly Fitria Bale, pelatihan Penyelia Halal eksternal tanggal [isi]\n• Tugas, tanggung jawab, dan wewenang tim terdapat dalam manual SJPH\n• Pelatihan dan edukasi dilaksanakan pada tanggal [isi]\n• Audit internal dan Kaji ulang manajemen dilaksanakan pada tanggal [isi]\n• Prosedur tertulis pelatihan terdapat dalam manual SJPH",
  },
  { id: 2, kriteria: "Bahan", catatan: "Tidak ada kelemahan" },
  {
    id: 3, kriteria: "Proses Produk Halal",
    catatan: "Tidak ada kelemahan\n\nBukti implementasi:\n• Fasilitas produksi bersih, bebas dari najis dan hewan peliharaan\n• Tempat jauh dari peternakan babi\n• Ruang produksi khusus di dapur terpisah, tidak bercampur dengan dapur rumah\n• Peralatan dari stainless steel\n• Karyawan muslim, menggunakan APD saat proses produksi",
  },
  { id: 4, kriteria: "Produk", catatan: "Tidak ada kelemahan" },
  {
    id: 5, kriteria: "Pemantauan dan Evaluasi",
    catatan: "Tidak ada kelemahan\n\nBukti implementasi:\n• Audit internal dan kaji ulang manajemen dilaksanakan pada tanggal [isi]",
  },
  { id: 6, kriteria: "SOP terkait penerapan SJPH", catatan: "Tidak ada kelemahan" },
  { id: 7, kriteria: "Implementasi Keamanan Pangan", catatan: "Tidak ada kelemahan" },
];

function KriteriaTable({ mode = "draft" }) {
  const [rows, setRows] = useState(INITIAL_KRITERIA);
  const locked = mode === "draft";

  const updateCatatan = (id, val) => {
    setRows(r => r.map(x => x.id === id ? { ...x, catatan: val } : x));
  };

  const thStyle = {
    background: T.blue, color: "#fff", fontWeight: 500, fontSize: 11,
    padding: "7px 8px", textAlign: "left",
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {locked && (
        <div style={{
          background: T.goldLight, border: `1px dashed ${T.gold}`,
          borderRadius: 4, padding: "8px 12px", marginBottom: 10,
          fontSize: 11, color: T.gold, display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>⚠</span>
          <span>Kriteria SJPH diisi setelah audit selesai. Ubah mode ke <strong>Ringkasan</strong> untuk mulai mengisi.</span>
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <colgroup>
          <col style={{ width: 32 }} />
          <col style={{ width: 200 }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle}>No</th>
            <th style={thStyle}>Kriteria SJPH</th>
            <th style={thStyle}>Catatan Auditor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} style={{ background: i % 2 === 0 ? T.bg : T.bgAlt }}>
              <td style={{ padding: "8px 8px", textAlign: "center", color: T.faint, fontSize: 11, verticalAlign: "top" }}>{row.id}</td>
              <td style={{ padding: "8px 8px", fontWeight: 500, fontSize: 12, color: T.text, verticalAlign: "top" }}>{row.kriteria}</td>
              <td style={{ padding: "6px 8px", verticalAlign: "top" }}>
                <AutoResizeTextarea
                  value={row.catatan}
                  onChange={(v) => updateCatatan(row.id, v)}
                  disabled={locked}
                  placeholder={locked ? "Diisi setelah audit..." : "Catatan auditor..."}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Auto-resize textarea — height follows content
function AutoResizeTextarea({ value, onChange, disabled, placeholder }) {
  const ref = useRef();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      style={{
        width: "100%", border: disabled ? "none" : `1px solid ${T.border}`,
        borderRadius: disabled ? 0 : 3,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12, padding: disabled ? "2px 0" : "6px 8px",
        resize: "none", color: disabled ? T.muted : T.text,
        background: disabled ? "transparent" : "#fff",
        lineHeight: 1.6, overflow: "hidden", minHeight: 28,
        outline: "none", transition: "border-color 0.15s",
        cursor: disabled ? "default" : "text",
        opacity: disabled ? 0.75 : 1,
        boxSizing: "border-box",
        display: "block",
      }}
      onFocus={e => { if (!disabled) e.target.style.borderColor = T.blue; }}
      onBlur={e => { if (!disabled) e.target.style.borderColor = T.border; }}
    />
  );
}

// ─── Mode Tabs ────────────────────────────────────────────────────────────────
const MODES = ["draft", "ringkasan", "final"];
const MODE_LABELS = { draft: "Draft", ringkasan: "Ringkasan", final: "Final / LHA" };

function ModeTabs({ mode, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 0,
      background: "rgba(255,255,255,0.12)", borderRadius: 6, overflow: "hidden",
    }}>
      {MODES.map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          background: mode === m ? "rgba(255,255,255,0.22)" : "none",
          border: "none", color: mode === m ? "#fff" : "rgba(255,255,255,0.7)",
          padding: "6px 14px", fontSize: 12, fontFamily: "inherit",
          cursor: "pointer", fontWeight: 500, transition: "all 0.15s",
        }}>
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function HARSApp() {
  const [mode, setMode] = useState("draft");

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "#f0ede8", minHeight: "100vh" }}>
      {/* Top nav */}
      <nav style={{
        background: T.blue, color: "#fff", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 48, position: "sticky", top: 0, zIndex: 200,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.03em", opacity: 0.95 }}>
          LPH UIN Jakarta · HARS Workspace
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ModeTabs mode={mode} onChange={setMode} />
          <button onClick={() => window.print()} style={{
            background: T.gold, border: "none", color: "#fff",
            padding: "5px 14px", borderRadius: 5, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>⎙ Cetak PDF</button>
        </div>
      </nav>

      {/* Page content */}
      <div style={{
        maxWidth: 900, margin: "24px auto", background: T.bg,
        border: `1px solid ${T.border}`, borderRadius: 4, overflow: "hidden",
      }}>
        {/* Version ribbon */}
        <div style={{
          background: T.goldLight, borderBottom: `1px solid #e8d58a`,
          padding: "7px 32px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            background: mode === "final" ? T.blue : T.gold,
            color: "#fff", fontSize: 10, fontWeight: 600,
            padding: "2px 8px", borderRadius: 3, letterSpacing: "0.05em",
          }}>
            {mode === "draft" ? "DRAFT" : mode === "ringkasan" ? "RINGKASAN PASCA AUDIT" : "LAPORAN HASIL AUDIT"}
          </span>
          <span style={{ fontSize: 11, color: T.gold }}>
            {mode === "draft"
              ? "Pre-audit · Kriteria SJPH diisi setelah audit"
              : mode === "ringkasan"
              ? "Pasca audit · Kriteria SJPH dapat diisi"
              : "Final · Siap diupload ke SIHALAL"}
          </span>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* Daftar Bahan */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: T.blue,
            letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "6px 0", marginBottom: 12,
            borderBottom: `1.5px solid ${T.blueLight}`,
          }}>Daftar Bahan</div>
          <BahanTable />

          {/* Kriteria SJPH */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: T.blue,
            letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "6px 0", margin: "24px 0 12px",
            borderBottom: `1.5px solid ${T.blueLight}`,
          }}>Kriteria SJPH</div>
          <KriteriaTable mode={mode} />
        </div>
      </div>
    </div>
  );
}
