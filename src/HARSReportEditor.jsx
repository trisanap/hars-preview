import { useState, useRef, useEffect, useCallback } from "react";
import html2pdf from "html2pdf.js";
import { api } from "./api";
import { useLang } from "./i18n";

import logoSrc from '../template/LOGO.png';
import cornerLogoSrc from '../template/uin_corner-logo.png';

import { signature as sigImg, stamp as stampImg } from "./images";
const C = {
  blue:"#1565c0", blueMid:"#1976d2", blueLight:"#e3f0fb",
  gold:"#b8860b", goldLight:"#fdf8e8",
  red:"#c0392b", green:"#1b5e20", greenLight:"#e8f5e9",
  text:"#1a1a1a", muted:"#555", faint:"#888",
  border:"#d0d0d0", borderLight:"#e8e8e8",
  bg:"#fff", bgAlt:"#f7f7f5",
};
const font = "'IBM Plex Sans', sans-serif";
const mono = "'IBM Plex Mono', monospace";

const MONTHS_ID = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAYS_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

// ─── Photo entry helpers ──────────────────────────────────────────────────────
// PhotoEntry = string (bare URL, treated as size "m") | { url, size: "s"|"m"|"l" }
function toEntry(p) { return typeof p === "string" ? { url: p, size: "m" } : p; }
function getUrl(p) { return typeof p === "string" ? p : p.url; }

function fmtDateLong(iso) {
  if (!iso) return "—";
  const dt = new Date(iso + "T00:00:00");
  const [y,m,d] = iso.split("-");
  return `${DAYS_ID[dt.getDay()]}, ${parseInt(d)} ${MONTHS_ID[parseInt(m)]} ${y}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  const [y,m,d] = iso.split("-");
  return `${parseInt(d)} ${MONTHS_ID[parseInt(m)]} ${y}`;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Badge({ color="blue", children }) {
  const s = {
    blue:{bg:C.blueLight,text:C.blue}, gold:{bg:C.goldLight,text:C.gold},
    green:{bg:C.greenLight,text:C.green}, gray:{bg:"#f0f0ee",text:C.muted},
    red:{bg:"#fce4ec",text:C.red}, kemasan:{bg:"#f3e5f5",text:"#6a1b9a"},
    cleaning:{bg:"#e8f5e9",text:C.green}, baru:{bg:"#fff3e0",text:"#b8540a"},
  }[color] || {bg:C.blueLight,text:C.blue};
  return <span style={{background:s.bg,color:s.text,fontSize:10,fontWeight:600,
    padding:"2px 6px",borderRadius:3,display:"inline-block",whiteSpace:"nowrap"}}>{children}</span>;
}

function IconBtn({ title, onClick, color, children }) {
  const [hov, setHov] = useState(false);
  return <button title={title} onClick={onClick}
    onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{background:hov?(color==="red"?"#fce4ec":C.blueLight):"transparent",
      border:"none",borderRadius:4,cursor:"pointer",
      color:hov?(color==="red"?C.red:C.blue):C.muted,
      padding:"3px 5px",fontSize:13,lineHeight:1,transition:"all 0.15s",
      display:"inline-flex",alignItems:"center"}}>{children}</button>;
}

// ─── Auto-resize textarea ─────────────────────────────────────────────────────
function AutoTA({ value, onChange, disabled, placeholder }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  const taStyle = {width:"100%",border:disabled?"none":`1px solid ${C.border}`,borderRadius:disabled?0:3,
    fontFamily:font,fontSize:12,padding:disabled?"2px 0":"6px 8px",resize:"none",
    color:disabled?C.muted:C.text,background:disabled?"transparent":C.bg,
    lineHeight:1.6,overflow:"hidden",minHeight:28,outline:"none",
    cursor:disabled?"default":"text",opacity:disabled?0.75:1,
    boxSizing:"border-box",display:"block"};
  return <div style={{position:"relative"}}>
    <textarea ref={ref} value={value} onChange={e=>onChange(e.target.value)}
      disabled={disabled} placeholder={placeholder} className="screen-ta"
      style={taStyle}
      onFocus={e=>{if(!disabled)e.target.style.borderColor=C.blue;}}
      onBlur={e=>{if(!disabled)e.target.style.borderColor=C.border;}} />
    <div className="print-only" style={{display:"none",whiteSpace:"pre-wrap",wordBreak:"break-word",
      fontFamily:font,fontSize:12,padding:"2px 0",lineHeight:1.6,color:C.text}}>
      {value||placeholder||""}
    </div>
  </div>;
}

// ─── BPJPH API ────────────────────────────────────────────────────────────────
async function fetchBPJPH(params) {
  const q = new URLSearchParams();
  if (params.nama_produk?.trim()) q.set("nama_produk", params.nama_produk.trim());
  if (params.nama_pelaku_usaha?.trim()) q.set("nama_pelaku_usaha", params.nama_pelaku_usaha.trim());
  if (params.no_sertifikat?.trim()) q.set("no_sertifikat", params.no_sertifikat.trim());
  if (![...q.keys()].length) return [];
  const url = `/bpjph-api/api/v2/dashboard/halal-certificate-list?${q.toString()}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const json = await resp.json();
    if (json.statusCode !== 2000 || !json.data?.datas?.length) return [];
    return json.data.datas.map(d => ({
      id: d.sertifikat.no_sertifikat,
      nama: d.nama_produk,
      produsen: d.pelaku_usaha.nama_pelaku_usaha,
      tgl: d.sertifikat.tgl_terbit_sertifikat,
    }));
  } catch {
    return [];
  }
}

function buildTemuan(item) {
  return `SH BPJPH ${item.id}, terbit tanggal ${item.tgl}, dari Produsen ${item.produsen}`;
}

/** Verify a single halal certificate number via BPJPH API */
async function verifyCertById(noSertifikat) {
  try {
    const resp = await fetch(`/bpjph-api/api/v2/dashboard/halal-certificate-list?no_sertifikat=${encodeURIComponent(noSertifikat)}`);
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json.statusCode !== 2000 || !json.data?.datas?.length) return null;
    const d = json.data.datas[0];
    return {
      id: d.no_sertifikat || d.sertifikat?.no_sertifikat || noSertifikat,
      tgl: d.tanggal_terbit || d.sertifikat?.tgl_terbit_sertifikat || "",
      produsen: d.produsen || d.pelaku_usaha?.nama_pelaku_usaha || "",
    };
  } catch {
    return null;
  }
}

function BPJPHModal({ onClose, onSelect }) {
  const { t } = useLang();
  const [np,setNp]=useState(""); const [pu,setPu]=useState(""); const [sh,setSh]=useState("");
  const [res,setRes]=useState([]); const [loading,setLoading]=useState(false); const [searched,setSearched]=useState(false);
  const inp = {flex:1,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 8px",
    fontSize:12,fontFamily:font,outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2};
  const search = useCallback(async()=>{
    if(!np.trim()&&!pu.trim()&&!sh.trim())return;
    setLoading(true);setSearched(true);
    setRes(await fetchBPJPH({nama_produk:np,nama_pelaku_usaha:pu,no_sertifikat:sh}));
    setLoading(false);
  },[np,pu,sh]);
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:580,boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
      border:`1px solid ${C.border}`,fontFamily:font,maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.blue,color:"#fff",padding:"11px 16px",borderRadius:"8px 8px 0 0",
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontWeight:600,fontSize:13}}>🔍 Cari Sertifikat BPJPH</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18}}>×</button>
      </div>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",flexDirection:"column",gap:8}}>
        <div><label style={lbl}>Nama Produk</label>
          <input value={np} onChange={e=>setNp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} style={inp} placeholder="Contoh: AQUA"/></div>
        <div><label style={lbl}>Produsen / Pelaku Usaha</label>
          <input value={pu} onChange={e=>setPu(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} style={inp} placeholder="Contoh: PT. Tirta Investama"/></div>
        <div><label style={lbl}>No. Sertifikat Halal (SH)</label>
          <input value={sh} onChange={e=>setSh(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} style={inp} placeholder="Contoh: ID00410000009301219"/></div>
        <button onClick={search} style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,
          padding:"7px 0",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:font,width:"100%"}}>Cari</button>
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {loading&&<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Memeriksa ke BPJPH…</div>}
        {!loading&&searched&&res.length===0&&<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Sertifikat tidak ditemukan.</div>}
        {!loading&&res.map((r,i)=><div key={i} style={{padding:"10px 16px",borderBottom:`1px solid ${C.borderLight}`,
          display:"flex",alignItems:"flex-start",gap:12,background:i%2===0?C.bg:C.bgAlt}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:2}}>{r.nama}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:3}}>{r.produsen}</div>
            <div style={{fontSize:10,fontFamily:mono,color:C.blue}}>{r.id}</div>
            <div style={{fontSize:10,color:"#2e7d32",marginTop:2}}>✓ Terbit {r.tgl}</div>
          </div>
          <button onClick={()=>onSelect(r)} style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,
            padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font,flexShrink:0}}>
            ← Tambah
          </button>
        </div>)}
        {!loading&&!searched&&<div style={{padding:20,textAlign:"center",color:C.faint,fontSize:12}}>
          Isi salah satu atau semua kolom di atas lalu klik Cari.
        </div>}
      </div>
    </div>
  </div>;
}

// ─── Add Row Picker ───────────────────────────────────────────────────────────
function AddRowPicker({ onChoose, onClose }) {
  const { t } = useLang();
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:999,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:380,
      boxShadow:"0 8px 32px rgba(0,0,0,0.15)",border:`1px solid ${C.border}`,fontFamily:font,overflow:"hidden"}}>
      <div style={{background:C.blue,color:"#fff",padding:"11px 16px",fontWeight:600,fontSize:13}}>
        Tambah Bahan — Pilih Jenis
      </div>
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
        {[
          {key:"positif",icon:"✅",label:"Positif List (Tidak Diragukan)",desc:"Air, telur, buah, sayuran",bg:"#e8f0fb",border:"#b0c8ef",color:C.blue},
          {key:"bersertifikat",icon:"🔖",label:"Bersertifikat (Diragukan)",desc:"Memerlukan sertifikat halal BPJPH",bg:C.goldLight,border:"#e0c860",color:C.gold},
          {key:"manual",icon:"✏️",label:"Input Manual",desc:"Kemasan, cleaning agent, sertifikat luar negeri",bg:C.bgAlt,border:C.border,color:C.text},
        ].map(o=><button key={o.key} onClick={()=>onChoose(o.key)}
          style={{background:o.bg,border:`1px solid ${o.border}`,borderRadius:6,
            padding:"12px 16px",cursor:"pointer",textAlign:"left",fontFamily:font}}>
          <div style={{fontWeight:600,fontSize:13,color:o.color,marginBottom:3}}>{o.icon} {o.label}</div>
          <div style={{fontSize:11,color:C.muted}}>{o.desc}</div>
        </button>)}
      </div>
    </div>
  </div>;
}

// ─── Manual Row Form (inline) ─────────────────────────────────────────────────
function ManualRowForm({ initial, onSave, onCancel, showKet }) {
  const { t } = useLang();
  const [form,setForm]=useState(initial||{nama:"",jenis:"Bahan",temuan:"",ket:""});
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const inp={width:"100%",border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 8px",
    fontSize:12,fontFamily:font,color:C.text,background:C.bg,boxSizing:"border-box"};
  return <tr style={{background:C.blueLight}}>
    <td colSpan={showKet?7:6} style={{padding:"10px 12px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 110px",gap:8,marginBottom:8}}>
        <div>
          <label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>NAMA / MEREK BAHAN</label>
          <input value={form.nama} onChange={f("nama")} style={inp} placeholder="Nama dan merek bahan..." autoFocus/>
        </div>
        <div>
          <label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>JENIS</label>
          <select value={form.jenis} onChange={f("jenis")} style={inp}>
            <option>Bahan</option><option>Kemasan</option><option>Cleaning Agent</option><option>Lainnya</option>
          </select>
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>TEMUAN</label>
        <textarea value={form.temuan} onChange={f("temuan")} rows={2}
          style={{...inp,resize:"vertical",minHeight:44}} placeholder="SH BPJPH ID..., terbit tanggal ..., dari Produsen ..."/>
      </div>
      {showKet&&<div style={{marginBottom:8}}>
        <label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>KETERANGAN</label>
        <input value={form.ket} onChange={f("ket")} style={inp} placeholder="Sesuai / Perlu verifikasi"/>
      </div>}
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onSave(form)} style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,
          padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>Simpan</button>
        <button onClick={onCancel} style={{background:"transparent",color:C.muted,
          border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 14px",fontSize:12,cursor:"pointer",fontFamily:font}}>Batal</button>
      </div>
    </td>
  </tr>;
}

// ─── Bahan Import Excel Modal ────────────────────────────────────────────────
function BahanImportModal({ onImport, onClose }) {
  const { t } = useLang();
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setParsing(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Strict header validation (strip [brackets] for comparison)
      const headerRow = XLSX.utils.sheet_to_json(ws, { header: 1 })[0];
      if (!headerRow || headerRow.length < 2) {
        throw new Error("Format file tidak sesuai. Gunakan template: [No.] [Nama dan Merek Bahan] [Jenis Bahan] [Produsen] [No. Sertifikat Halal]");
      }
      const rawHeaders = headerRow.map(c => String(c).trim());
      const stripBrackets = s => s.replace(/^\[|\]$/g, '');
      const h = rawHeaders.map(stripBrackets);
      const required = ['Nama dan Merek Bahan', 'Jenis Bahan', 'Produsen', 'No. Sertifikat Halal'];
      const missing = required.filter(r => !h.includes(r));
      if (missing.length > 0) {
        throw new Error(`Format header tidak sesuai. Gunakan template:\n[No.] [Nama dan Merek Bahan] [Jenis Bahan] [Produsen] [No. Sertifikat Halal]\n\nHeader yang tidak ditemukan: ${missing.join(', ')}`);
      }

      // Map raw header → normalized name for data access
      const colMap = {};
      rawHeaders.forEach((raw, i) => { colMap[stripBrackets(raw)] = raw; });

      const data = XLSX.utils.sheet_to_json(ws);
      const mapped = data.map(row => {
        const nama = String(row[colMap['Nama dan Merek Bahan']] || '').trim();
        const jenis = String(row[colMap['Jenis Bahan']] || 'Bahan').trim();
        const produsen = String(row[colMap['Produsen']] || '').trim();
        const rawCert = String(row[colMap['No. Sertifikat Halal']] || '').trim();
        // Only treat as valid cert ID if it starts with "ID" and has ≥10 chars
        const certId = /^ID\d{8,}$/.test(rawCert) ? rawCert : '';
        return nama ? { nama, jenis, produsen, certId } : null;
      }).filter(Boolean);
      setPreview(mapped);
    } catch (err) { setError(err.message); }
    finally { setParsing(false); }
  };

  const border = `1px solid ${C.border}`;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:2000,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:560,
      boxShadow:"0 8px 32px rgba(0,0,0,0.18)",fontFamily:font,overflow:"hidden"}}>
      <div style={{background:C.blue,color:"#fff",padding:"11px 16px",fontWeight:600,fontSize:13,
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>📊 Import Excel — Daftar Bahan</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18}}>×</button>
      </div>
      <div style={{padding:16}}>
        <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6}}>Template:</div>
        <div style={{overflowX:"auto",marginBottom:14}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:420}}>
            <thead><tr style={{background:C.blueLight}}>
              <th style={{border,width:30,padding:"4px 6px"}}>No.</th>
              <th style={{border,padding:"4px 8px"}}>Nama dan Merek Bahan</th>
              <th style={{border,width:90,padding:"4px 6px"}}>Jenis Bahan</th>
              <th style={{border,width:140,padding:"4px 6px"}}>Produsen</th>
              <th style={{border,width:130,padding:"4px 6px"}}>No. Sertifikat Halal</th>
            </tr></thead>
            <tbody>
              <tr><td style={{border,padding:"4px 6px",textAlign:"center",color:C.faint}}>1</td>
                <td style={{border,padding:"4px 8px"}}>Tepung Terigu</td>
                <td style={{border,padding:"4px 6px"}}>Bahan</td>
                <td style={{border,padding:"4px 6px"}}>PT. ABC</td>
                <td style={{border,padding:"4px 6px",fontFamily:mono,fontSize:10}}>ID00410000090970121</td>
              </tr>
              <tr><td style={{border,padding:"4px 6px",textAlign:"center",color:C.faint}}>2</td>
                <td style={{border,padding:"4px 8px"}}>Beras Putih</td>
                <td style={{border,padding:"4px 6px"}}>Bahan</td>
                <td style={{border,padding:"4px 6px"}}>-</td>
                <td style={{border,padding:"4px 6px"}}>-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{border:`2px dashed ${C.border}`,borderRadius:6,padding:20,textAlign:"center",marginBottom:14,
          background:C.bgAlt,cursor:"pointer"}}
          onClick={()=>document.getElementById("bahan-excel-input")?.click()}>
          <div style={{fontSize:28,marginBottom:6}}>📁</div>
          <div style={{fontSize:12,color:C.muted}}>Klik untuk upload file Excel (.xlsx / .xls)</div>
          <input id="bahan-excel-input" type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleFile}/>
        </div>

        {parsing&&<div style={{fontSize:12,color:C.blue,textAlign:"center",padding:8}}>⏳ Membaca file...</div>}
        {error&&<div style={{fontSize:12,color:C.red,textAlign:"center",padding:8}}>{error}</div>}

        {preview!==null&&!parsing&&<div>
          <div style={{maxHeight:180,overflowY:"auto",border:border,borderRadius:4,marginBottom:12}}>
            {preview.length===0
              ? <div style={{padding:12,textAlign:"center",color:C.faint,fontSize:11}}>Tidak ada data ditemukan.</div>
              : preview.slice(0,50).map((item,i)=><div key={i} style={{padding:"4px 10px",fontSize:12,
                  borderBottom:border,background:i%2===0?C.bg:C.bgAlt,display:"flex",gap:6}}>
                  <span style={{color:C.faint,width:24,flexShrink:0}}>{i+1}.</span>
                  <span style={{flex:1}}>{item.nama}</span>
                  <span style={{color:C.muted,width:70,flexShrink:0}}>{item.jenis}</span>
                  {item.certId
                    ? <span style={{fontFamily:mono,fontSize:10,color:C.blue,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis"}}>{item.certId}</span>
                    : <span style={{fontSize:10,color:C.gold,fontWeight:600,flexShrink:0}}>Positif list</span>}
              </div>)}
            {preview.length>50&&<div style={{padding:"4px 10px",fontSize:11,color:C.muted,textAlign:"center"}}>... dan {preview.length-50} lainnya</div>}
          </div>
          <button onClick={()=>{onImport(preview);onClose();}}
            disabled={preview.length===0}
            style={{width:"100%",background:C.blue,color:"#fff",border:"none",borderRadius:4,
              padding:"8px 0",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:font,
              opacity:preview.length===0?0.5:1}}>
            Import {preview.length} Bahan
          </button>
        </div>}
      </div>
    </div>
  </div>;
}

// ─── Bahan Table ──────────────────────────────────────────────────────────────
const INITIAL_BAHAN = [];

function BahanTable({ mode, canEdit, rows, setRows }) {
  const { t } = useLang();
  const [editingId,setEditingId]=useState(null);
  const [showPicker,setShowPicker]=useState(null);
  const [showSearch,setShowSearch]=useState(false);
  const [pendingEditId,setPendingEditId]=useState(null);
  const [importing,setImporting]=useState(false);
  const [importProgress,setImportProgress]=useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markValue, setMarkValue] = useState("Sesuai");
  const showKet = mode === "final";
  const getNextId = () => rows.length ? Math.max(...rows.map(r=>r.id)) + 1 : Date.now();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBahanImport, setShowBahanImport] = useState(false);
  const [showReorder, setShowReorder] = useState(null);

  const deleteRow = id => setShowDeleteConfirm(id);
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === rows.length) return new Set();
      return new Set(rows.map(r => r.id));
    });
  };

  const handleBahanImport = async (list) => {
    setShowBahanImport(false);
    setImporting(true);
    let uniqueCertIds = [];
    let certCache = {};
    const withCert = list.filter(i => i.certId);
    const withoutCert = list.filter(i => !i.certId);

    // Items with cert → batch verify via BPJPH
    if (withCert.length > 0) {
      setImportProgress(`🔍 Memverifikasi ${withCert.length} sertifikat ke BPJPH...`);
      uniqueCertIds = [...new Set(withCert.map(i => i.certId))];
      certCache = {};
      for (let i = 0; i < uniqueCertIds.length; i++) {
        setImportProgress(`🔍 Verifikasi sertifikat (${i+1}/${uniqueCertIds.length})...`);
        try {
          const result = await verifyCertById(uniqueCertIds[i]);
          if (result) certCache[uniqueCertIds[i]] = result;
        } catch {}
        await new Promise(r => setTimeout(r, 500));
      }
    }

    const newRows = [];

    // Items with cert → map results
    for (const item of withCert) {
      const cert = certCache[item.certId];
      newRows.push({
        id: getNextId() + newRows.length,
        nama: item.nama,
        jenis: item.jenis || "Bahan",
        temuan: cert ? buildTemuan(cert) : "",
        ket: cert ? "Sesuai" : "",
        isNew: true,
      });
    }

    // Items without cert → Positif list
    for (const item of withoutCert) {
      newRows.push({
        id: getNextId() + newRows.length,
        nama: item.nama,
        jenis: item.jenis || "Bahan",
        temuan: "Positif list",
        ket: "Sesuai",
        isNew: true,
      });
    }

    setRows(r => [...r, ...newRows]);
    const verified = Object.keys(certCache).length;
    setImporting(false);
    setImportProgress(null);
    setImportSummary({
      total: newRows.length,
      verified,
      unverified: withCert.length - verified,
      positifList: withoutCert.length,
      apiCalls: uniqueCertIds.length,
    });
  };

  const handlePickerChoice = (choice, editId=null) => {
    setShowPicker(null);
    if (choice==="positif") {
      const name = window.prompt("Nama bahan positif list:");
      if (!name) return;
      const nr = {id:getNextId(),nama:name,jenis:"Bahan",temuan:"positif",ket:"Sesuai"};
      editId ? setRows(r=>r.map(x=>x.id===editId?nr:x)) : setRows(r=>[...r,nr]);
    } else if (choice==="bersertifikat") {
      setPendingEditId(editId||null); setShowSearch(true);
    } else {
      setEditingId(editId||"new");
    }
  };

  const handleSearchSelect = item => {
    const nr = {id:pendingEditId||getNextId(),nama:item.nama,jenis:"Bahan",
      temuan:buildTemuan(item),ket:"Sesuai",isNew:!pendingEditId};
    pendingEditId ? setRows(r=>r.map(x=>x.id===pendingEditId?nr:x)) : setRows(r=>[...r,nr]);
    setShowSearch(false); setPendingEditId(null);
  };

  const handleManualSave = form => {
    editingId==="new"
      ? setRows(r=>[...r,{id:getNextId(),...form,isNew:true}])
      : setRows(r=>r.map(x=>x.id===editingId?{...x,...form}:x));
    setEditingId(null);
  };

  const th = {background:C.blue,color:"#fff",fontWeight:500,fontSize:11,padding:"7px 8px",textAlign:"left"};

  return <div style={{fontFamily:font}}>
    {showPicker&&<AddRowPicker onChoose={c=>handlePickerChoice(c,showPicker==="add"?null:parseInt(showPicker.split(":")[1]))} onClose={()=>setShowPicker(null)}/>}
    {showSearch&&<BPJPHModal onClose={()=>{setShowSearch(false);setPendingEditId(null);}} onSelect={handleSearchSelect}/>}
    {showDeleteConfirm!==null&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&setShowDeleteConfirm(null)}>
      <div style={{background:C.bg,borderRadius:8,padding:"20px 24px",maxWidth:340,width:"100%",
        boxShadow:"0 8px 30px rgba(0,0,0,0.18)",fontFamily:font}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Hapus Bahan</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:16}}>
          {showDeleteConfirm==="__bulk__"
            ? `Hapus ${selectedIds.size} bahan terpilih?`
            : "Hapus bahan ini dari daftar?"}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={()=>setShowDeleteConfirm(null)} style={{background:"transparent",
            border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 16px",fontSize:12,
            cursor:"pointer",fontFamily:font}}>Batal</button>
          <button onClick={()=>{
            if (showDeleteConfirm==="__bulk__") {
              setRows(r=>r.filter(x=>!selectedIds.has(x.id)));
              setSelectedIds(new Set());
            } else {
              setRows(r=>r.filter(x=>x.id!==showDeleteConfirm));
            }
            setShowDeleteConfirm(null);
          }}
            style={{background:C.red,border:"none",borderRadius:4,padding:"6px 16px",fontSize:12,
              fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:font}}>Ya, Hapus</button>
        </div>
      </div>
    </div>}
    {showBahanImport&&<BahanImportModal
      onImport={handleBahanImport}
      onClose={()=>setShowBahanImport(false)}/>}
    {importSummary&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:2100,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&setImportSummary(null)}>
      <div style={{background:C.bg,borderRadius:8,padding:"20px 24px",maxWidth:400,width:"100%",
        boxShadow:"0 8px 30px rgba(0,0,0,0.18)",fontFamily:font}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12,color:C.blue}}>🔁 Import Summary</div>
        <div style={{fontSize:12,lineHeight:1.8}}>
          <div><strong>{importSummary.total}</strong> total items processed</div>
          <div><strong>{importSummary.verified}</strong> items with halal certificates → Temuan filled ✅</div>
          {importSummary.unverified>0&&<div><strong>{importSummary.unverified}</strong> items with unverified certs → Temuan kosong</div>}
          <div><strong>{importSummary.positifList}</strong> items raw ingredients → Temuan "Positif list"</div>
          <div style={{color:C.muted}}><strong>{importSummary.apiCalls}</strong> API calls to BPJPH</div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button onClick={()=>setImportSummary(null)}
            style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,padding:"6px 20px",
              fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>OK</button>
        </div>
      </div>
    </div>}
    {showMarkModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&setShowMarkModal(false)}>
      <div style={{background:C.bg,borderRadius:8,padding:"20px 24px",maxWidth:340,width:"100%",
        boxShadow:"0 8px 30px rgba(0,0,0,0.18)",fontFamily:font}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Tandai {selectedIds.size} Bahan</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Atur keterangan untuk semua bahan terpilih:</div>
        <select value={markValue} onChange={e=>setMarkValue(e.target.value)}
          style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 10px",
            fontSize:12,fontFamily:font,marginBottom:14}}>
          <option value="Sesuai">Sesuai</option>
          <option value="Butuh SH">Butuh SH</option>
          <option value="Diganti">Diganti</option>
          <option value="Dikeluarkan">Dikeluarkan</option>
          <option value="Tambahan">Tambahan</option>
          <option value="Butuh Spec Bahan/MSDS">Butuh Spec Bahan/MSDS</option>
        </select>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={()=>setShowMarkModal(false)}
            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,
              padding:"6px 16px",fontSize:12,cursor:"pointer",fontFamily:font}}>Batal</button>
          <button onClick={()=>{setRows(r=>r.map(x=>selectedIds.has(x.id)?{...x,ket:markValue}:x));setShowMarkModal(false);}}
            style={{background:C.blue,border:"none",borderRadius:4,padding:"6px 16px",fontSize:12,
              fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:font}}>Terapkan</button>
        </div>
      </div>
    </div>}
    {canEdit&&<div style={{marginBottom:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}} className="print-hide">
      <button onClick={()=>setShowPicker("add")} style={{background:"transparent",
        border:`1px dashed ${C.blue}`,borderRadius:4,padding:"5px 14px",fontSize:12,
        color:C.blue,cursor:"pointer",fontFamily:font,fontWeight:500}}>+ Tambah Bahan</button>
      <button onClick={()=>setShowBahanImport(true)}
        style={{background:"transparent",border:`1px dashed ${C.gold}`,borderRadius:4,
          padding:"5px 14px",fontSize:12,color:C.gold,cursor:"pointer",fontFamily:font,fontWeight:500}}>
        📊 Import Excel
      </button>
      {selectedIds.size>0&&<>
        <button onClick={()=>setShowMarkModal(true)}
          style={{background:C.blueMid,border:"none",borderRadius:4,padding:"5px 14px",fontSize:12,
            color:"#fff",cursor:"pointer",fontFamily:font,fontWeight:500}}>
          🏷 Tandai ({selectedIds.size})
        </button>
        <button onClick={()=>setShowDeleteConfirm("__bulk__")}
          style={{background:C.red,border:"none",borderRadius:4,padding:"5px 14px",fontSize:12,
            color:"#fff",cursor:"pointer",fontFamily:font,fontWeight:500}}>
          🗑 Hapus ({selectedIds.size})
        </button>
      </>}
    </div>}
    {importProgress&&<div style={{marginBottom:10,padding:"8px 12px",borderRadius:4,
      background:importProgress.startsWith("✗")?"#fce4ec":importProgress.startsWith("✓")?"#e8f5e9":C.blueUltraLight,
      border:`1px solid ${importProgress.startsWith("✗")?"#e8b4b4":importProgress.startsWith("✓")?"#a5d6a7":C.blueLight}`,
      fontSize:12,color:importProgress.startsWith("✗")?"#c0392b":importProgress.startsWith("✓")?"#1b5e20":C.blue}}
      className="print-hide">
      {importProgress}
    </div>}
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <colgroup>
          <col style={{width:36}} className="print-hide"/><col style={{width:28}}/><col style={{width:180}}/><col style={{width:76}}/>
          <col style={{width:64}}/><col style={{width:200}}/>{showKet&&<col style={{width:130}}/>}<col className="aksi-col" style={{width:60}}/>
        </colgroup>
        <thead><tr>
          <th style={{...th,textAlign:"center",padding:"7px 4px"}} className="print-hide">
            <input type="checkbox" checked={selectedIds.size===rows.length&&rows.length>0}
              onChange={toggleSelectAll}
              style={{cursor:"pointer",margin:0}}/>
          </th>
          <th style={th}>No</th>
          <th style={th}>Nama dan Merek Bahan</th>
          <th style={th}>Jenis</th>
          <th style={{...th,textAlign:"center"}}>Diragukan</th>
          <th style={th}>Temuan</th>
          {showKet&&<th style={th}>Keterangan</th>}
          <th style={{...th,textAlign:"center"}} className="aksi-col">Aksi</th>
        </tr></thead>
        <tbody>
          {rows.map((row,i)=>{
            const isPositif = row.temuan==="positif" || row.temuan==="Positif list";
            if (editingId===row.id) return <ManualRowForm key={row.id} initial={row} showKet={showKet}
              onSave={handleManualSave} onCancel={()=>setEditingId(null)}/>;
            return <tr key={row.id} style={{background:i%2===0?C.bg:C.bgAlt}}>
              <td style={{padding:"5px 8px",textAlign:"center",verticalAlign:"top"}} className="print-hide">
                <input type="checkbox" checked={selectedIds.has(row.id)}
                  onChange={()=>toggleSelect(row.id)}
                  style={{cursor:"pointer",margin:0}}/>
              </td>
              <td style={{padding:"5px 8px",textAlign:"center",color:C.faint,fontSize:11}}>{i+1}</td>
              <td style={{padding:"5px 8px",verticalAlign:"top"}}>
                <span style={{fontWeight:500}}>{row.nama}</span>
              </td>
              <td style={{padding:"5px 8px",verticalAlign:"top"}}>
                <Badge color={row.jenis==="Kemasan"?"kemasan":row.jenis==="Cleaning Agent"?"cleaning":"blue"}>{row.jenis}</Badge>
              </td>
              <td style={{padding:"5px 8px",textAlign:"center",color:C.blueMid,fontSize:14,verticalAlign:"top"}}>{!isPositif?"✓":""}</td>
              <td style={{padding:"5px 8px",verticalAlign:"top"}}>
                {isPositif
                  ? <span style={{fontStyle:"italic",color:"#1a5276",fontSize:11.5}}>Positif list</span>
                  : !row.temuan ? <span style={{color:C.faint,fontSize:11}}>—</span>
                  : <span style={{fontFamily:mono,fontSize:10.5,lineHeight:1.4}}>{row.temuan}</span>}
              </td>
              {showKet&&<td style={{padding:"5px 8px",verticalAlign:"top"}}>
                {canEdit
                  ? <select value={row.ket||""} onChange={e=>setRows(r=>r.map(x=>x.id===row.id?{...x,ket:e.target.value}:x))}
                      style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:3,padding:"3px 4px",fontSize:11,fontFamily:font,background:C.bg}}>
                      <option value="">—</option>
                      {isPositif
                        ? <><option value="Sesuai">Sesuai</option><option value="Butuh Spec Bahan/MSDS">Butuh Spec Bahan/MSDS</option></>
                        : <><option value="Sesuai">Sesuai</option>
                          <option value="Butuh SH">Butuh SH</option>
                          <option value="Diganti">Diganti</option>
                          <option value="Dikeluarkan">Dikeluarkan</option>
                          <option value="Tambahan">Tambahan</option></>}
                    </select>
                  : <span style={{fontSize:11,color:C.muted}}>{row.ket||"—"}</span>}
              </td>}
              <td style={{padding:"4px 6px",textAlign:"center",verticalAlign:"top",whiteSpace:"nowrap"}} className="aksi-col">
                {canEdit&&<><IconBtn title="Edit" onClick={()=>setShowPicker(`edit:${row.id}`)}>✏️</IconBtn>
                <IconBtn title="Hapus" color="red" onClick={()=>deleteRow(row.id)}>🗑</IconBtn></>}
              </td>
            </tr>;
          })}
          {editingId==="new"&&<ManualRowForm showKet={showKet} onSave={handleManualSave} onCancel={()=>setEditingId(null)}/>}
        </tbody>
      </table>
    </div>
  </div>;
}

// ─── Kriteria SJPH ────────────────────────────────────────────────────────────
const KRITERIA_SKELETON = [
  {id:1,kriteria:"Komitmen dan Tanggung Jawab",catatan:"Tidak ada kelemahan\n\nBukti implementasi:\n1. Kebijakan halal perusahaan telah ditetapkan pada tanggal <<Tanggal>>\n2. Cara sosialisasi kebijakan halal kepada stakeholder terkait melalui pelatihan internal.\n3. Penyelia halal adalah <<Nama Penyelia>> dengan pelatihan Penyelia Halal eksternal tanggal <<Tanggal>>\n4. Penjelasan mengenai tugas, tanggung jawab, dan wewenang tim terdapat dalam manual SJPH.\n5. Pelatihan dan edukasi dilaksanakan pada tanggal <<Tanggal>>\n6. Audit internal dan Kaji ulang manajemen sudah dilaksanakan pada tanggal <<Tanggal>>\n7. Prosedur tertulis pelatihan terdapat dalam manual SJPH"},
  {id:2,kriteria:"Bahan",catatan:""},
  {id:3,kriteria:"Proses Produk Halal",catatan:"Tidak ada kelemahan\n\nBukti implementasi:\na. Fasilitas produksi bersih, bebas dari najis dan hewan peliharaan maupun hewan non halal\nb. Tempat jauh dari peternakan babi\nc. Ruang produksi khusus ada di dapur terpisah, tidak bercampur dengan dapur rumah.\nd. Peralatan yang digunakan dari stainless steal\ne. Karyawan muslim, saat proses produksi menggunakan APD"},
  {id:4,kriteria:"Produk",catatan:""},
  {id:5,kriteria:"Pemantauan dan Evaluasi",catatan:"Tidak ada kelemahan\n\nBukti implementasi:\nSudah dilakukan audit internal dan kaji ulang manajemen pada tanggal <<Tanggal>>"},
  {id:6,kriteria:"SOP terkait penerapan SJPH",catatan:""},
  {id:7,kriteria:"Implementasi Keamanan Pangan",catatan:""},
];

function KriteriaTable({ mode, canEdit, rows, setRows }) {
  const { t } = useLang();
  const locked = !canEdit;
  const update = (id,val) => setRows(r=>r.map(x=>x.id===id?{...x,catatan:val}:x));
  const th = {background:C.blue,color:"#fff",fontWeight:500,fontSize:11,padding:"7px 8px",textAlign:"left"};

  return <div style={{fontFamily:font}}>
    {locked&&<div style={{background:C.bgAlt,border:`1px dashed ${C.border}`,
      borderRadius:4,padding:"8px 12px",marginBottom:10,fontSize:11,color:C.muted}}>
      Kriteria SJPH hanya dapat diedit oleh auditor yang ditugaskan.
    </div>}
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <colgroup><col style={{width:28}}/><col style={{width:200}}/><col/></colgroup>
      <thead><tr>
        <th style={th}>No</th><th style={th}>Kriteria SJPH</th><th style={th}>Catatan Auditor</th>
      </tr></thead>
      <tbody>{rows.map((row,i)=><tr key={row.id} style={{background:i%2===0?C.bg:C.bgAlt}}>
        <td style={{padding:"8px",textAlign:"center",color:C.faint,fontSize:11,verticalAlign:"top"}}>{row.id}</td>
        <td style={{padding:"8px",fontWeight:500,fontSize:12,verticalAlign:"top"}}>{row.kriteria}</td>
        <td style={{padding:"6px 8px",verticalAlign:"top"}}>
          <AutoTA value={row.catatan} onChange={v=>update(row.id,v)} disabled={locked}
            placeholder={locked?"Diisi setelah audit…":"Catatan auditor…"}/>
        </td>
      </tr>)}</tbody>
    </table>
  </div>;
}

// ─── Fasilitas Table ──────────────────────────────────────────────────────────
function FasilitasTable({ reg, mode, canEdit, rows, setRows }) {
  const { t } = useLang();
  const [editing,setEditing]=useState(null);
  const th = {background:C.blue,color:"#fff",fontWeight:500,fontSize:11,padding:"6px 8px",textAlign:"left"};
  const inp = {width:"100%",border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",fontSize:12,fontFamily:font};

  return <div style={{fontFamily:font}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <colgroup><col style={{width:28}}/><col style={{width:160}}/><col style={{width:200}}/><col style={{width:100}}/><col style={{width:80}}/><col className="aksi-col" style={{width:52}}/></colgroup>
      <thead><tr>
        <th style={th}>No</th><th style={th}>Nama Fasilitas</th><th style={th}>Alamat</th>
        <th style={th}>Kota</th><th style={th}>Negara</th>
        {canEdit&&<th style={{...th,textAlign:"center"}} className="aksi-col">Aksi</th>}
      </tr></thead>
      <tbody>
        {rows.map((r,i)=>editing===r.id
          ? <tr key={r.id} style={{background:C.blueLight}}>
              <td colSpan={canEdit?6:5} style={{padding:"10px 12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>NAMA FASILITAS</label>
                    <input value={r.nama} onChange={e=>setRows(rr=>rr.map(x=>x.id===r.id?{...x,nama:e.target.value}:x))} style={inp} autoFocus/></div>
                  <div><label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>KOTA</label>
                    <input value={r.kota} onChange={e=>setRows(rr=>rr.map(x=>x.id===r.id?{...x,kota:e.target.value}:x))} style={inp}/></div>
                </div>
                <div style={{marginBottom:8}}><label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>ALAMAT</label>
                  <input value={r.alamat} onChange={e=>setRows(rr=>rr.map(x=>x.id===r.id?{...x,alamat:e.target.value}:x))} style={inp}/></div>
                <button onClick={()=>setEditing(null)} style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>Simpan</button>
              </td>
            </tr>
          : <tr key={r.id} style={{background:i%2===0?C.bg:C.bgAlt}}>
              <td style={{padding:"6px 8px",textAlign:"center",color:C.faint,fontSize:11}}>{i+1}</td>
              <td style={{padding:"6px 8px",fontWeight:500}}>{r.nama||"—"}</td>
              <td style={{padding:"6px 8px",color:C.muted}}>{r.alamat||"—"}</td>
              <td style={{padding:"6px 8px",color:C.muted}}>{r.kota||"—"}</td>
              <td style={{padding:"6px 8px",color:C.muted}}>{r.negara}</td>
              {canEdit&&<td style={{padding:"4px 6px",textAlign:"center"}} className="aksi-col">
                <IconBtn title="Edit" onClick={()=>setEditing(r.id)}>✏️</IconBtn>
                {rows.length>1&&<IconBtn title="Hapus" color="red" onClick={()=>setRows(rr=>rr.filter(x=>x.id!==r.id))}>🗑</IconBtn>}
              </td>}
            </tr>
        )}
        {canEdit&&editing===null&&<tr className="tambah-row"><td colSpan={6} style={{padding:"6px 8px",borderTop:`1px dashed ${C.border}`}}>
          <button onClick={()=>{const nr={id:Date.now(),nama:"",alamat:"",kota:"",negara:"Indonesia"};setRows(r=>[...r,nr]);setEditing(nr.id);}}
            style={{background:"transparent",border:`1px dashed ${C.blue}`,borderRadius:4,padding:"5px 14px",fontSize:12,color:C.blue,cursor:"pointer",fontFamily:font,fontWeight:500}}>
            + Tambah Fasilitas
          </button>
        </td></tr>}
      </tbody>
    </table>
  </div>;
}

// ─── Penyelia Halal Table ─────────────────────────────────────────────────────
function PenyeliaTable({ reg, canEdit, rows, setRows }) {
  const { t } = useLang();
  const [editing,setEditing]=useState(null);
  const [showPickPenyelia,setShowPickPenyelia]=useState(false);
  const th = {background:C.blue,color:"#fff",fontWeight:500,fontSize:11,padding:"6px 8px",textAlign:"left"};
  const inp = {width:"100%",border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",fontSize:11,fontFamily:font};
  const regPenyelia = reg?.penyeliaHalal?.trim();

  return <div style={{fontFamily:font}}>
    {showPickPenyelia&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setShowPickPenyelia(false)}>
      <div style={{background:C.bg,borderRadius:6,boxShadow:"0 8px 30px rgba(0,0,0,0.18)",width:400,maxWidth:"90vw",padding:20}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Penyelia dari Data Pengajuan</div>
        <table style={{width:"100%",fontSize:12}}>
          <tbody>
            <tr><td style={{padding:"4px 8px",color:C.muted,width:100}}>Nama</td><td style={{padding:"4px 8px",fontWeight:500}}>{reg.penyeliaHalal||"—"}</td></tr>
            <tr><td style={{padding:"4px 8px",color:C.muted}}>No. KTP</td><td style={{padding:"4px 8px"}}>{reg.penyeliaNoKTP||"—"}</td></tr>
            <tr><td style={{padding:"4px 8px",color:C.muted}}>No. Sertifikat</td><td style={{padding:"4px 8px"}}>{reg.penyeliaNoSertifikat||"—"}</td></tr>
            <tr><td style={{padding:"4px 8px",color:C.muted}}>No. SK</td><td style={{padding:"4px 8px"}}>{reg.penyeliaNoSK||"—"}</td></tr>
            <tr><td style={{padding:"4px 8px",color:C.muted}}>No. Kontak</td><td style={{padding:"4px 8px"}}>{reg.penyeliaNoKontak||"—"}</td></tr>
          </tbody>
        </table>
        <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
          <button onClick={()=>setShowPickPenyelia(false)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:font}}>Batal</button>
          <button onClick={()=>{setRows(r=>[...r,{id:Date.now(),nama:reg.penyeliaHalal||"",noKTP:reg.penyeliaNoKTP||"",noSertifikat:reg.penyeliaNoSertifikat||"",noSK:reg.penyeliaNoSK||"",noKontak:reg.penyeliaNoKontak||""}]);setShowPickPenyelia(false);}}
            style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>Gunakan</button>
        </div>
      </div>
    </div>}
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
      <colgroup><col style={{width:28}}/><col style={{width:140}}/><col style={{width:110}}/><col style={{width:130}}/><col style={{width:130}}/><col style={{width:110}}/>{canEdit&&<col className="aksi-col" style={{width:56}}/>}</colgroup>
      <thead><tr>
        <th style={th}>No</th><th style={th}>Nama</th><th style={th}>No. KTP</th>
        <th style={th}>No./Tgl Sertifikat</th><th style={th}>No./Tgl SK</th><th style={th}>No. Kontak</th>
        {canEdit&&<th style={{...th,textAlign:"center"}} className="aksi-col">Aksi</th>}
      </tr></thead>
      <tbody>
        {rows.map((r,i)=>editing===r.id
          ? <tr key={r.id} style={{background:C.blueLight}}>
              <td colSpan={canEdit?7:6} style={{padding:"10px 12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>NAMA</label><input value={r.nama} onChange={e=>setRows(rr=>rr.map(x=>x.id===r.id?{...x,nama:e.target.value}:x))} style={inp} autoFocus/></div>
                  <div><label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>NO. KTP</label><input value={r.noKTP} onChange={e=>setRows(rr=>rr.map(x=>x.id===r.id?{...x,noKTP:e.target.value}:x))} style={inp}/></div>
                  <div><label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>NO./TGL SERTIFIKAT</label><input value={r.noSertifikat} onChange={e=>setRows(rr=>rr.map(x=>x.id===r.id?{...x,noSertifikat:e.target.value}:x))} style={inp}/></div>
                  <div><label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>NO./TGL SK</label><input value={r.noSK} onChange={e=>setRows(rr=>rr.map(x=>x.id===r.id?{...x,noSK:e.target.value}:x))} style={inp}/></div>
                  <div><label style={{fontSize:10,fontWeight:600,color:C.muted,display:"block",marginBottom:2}}>NO. KONTAK</label><input value={r.noKontak} onChange={e=>setRows(rr=>rr.map(x=>x.id===r.id?{...x,noKontak:e.target.value}:x))} style={inp}/></div>
                </div>
                <button onClick={()=>setEditing(null)} style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>Simpan</button>
              </td>
            </tr>
          : <tr key={r.id} style={{background:i%2===0?C.bg:C.bgAlt}}>
              <td style={{padding:"6px 8px",textAlign:"center",color:C.faint}}>{i+1}</td>
              <td style={{padding:"6px 8px",fontWeight:500}}>{r.nama||"—"}</td>
              <td style={{padding:"6px 8px",fontFamily:mono,fontSize:10}}>{r.noKTP||"—"}</td>
              <td style={{padding:"6px 8px",fontFamily:mono,fontSize:10}}>{r.noSertifikat||"—"}</td>
              <td style={{padding:"6px 8px",fontFamily:mono,fontSize:10}}>{r.noSK||"—"}</td>
              <td style={{padding:"6px 8px"}}>{r.noKontak||"—"}</td>
              {canEdit&&<td style={{padding:"4px 6px",textAlign:"center"}} className="aksi-col">
                <IconBtn title="Edit" onClick={()=>setEditing(r.id)}>✏️</IconBtn>
                {rows.length>1&&<IconBtn title="Hapus" color="red" onClick={()=>setRows(rr=>rr.filter(x=>x.id!==r.id))}>🗑</IconBtn>}
              </td>}
            </tr>
        )}
        {canEdit&&editing===null&&<tr className="tambah-row"><td colSpan={canEdit?7:6} style={{padding:"6px 8px",borderTop:`1px dashed ${C.border}`}}>
          <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{const nr={id:Date.now(),nama:"",noKTP:"",noSertifikat:"",noSK:"",noKontak:""};setRows(r=>[...r,nr]);setEditing(nr.id);}}
            style={{background:"transparent",border:`1px dashed ${C.blue}`,borderRadius:4,padding:"5px 14px",fontSize:12,color:C.blue,cursor:"pointer",fontFamily:font,fontWeight:500}}>
            + Tambah Penyelia
          </button>
          {regPenyelia&&<button onClick={()=>setShowPickPenyelia(true)}
            style={{background:"transparent",border:`1px dashed ${C.gold}`,borderRadius:4,padding:"5px 14px",fontSize:12,color:C.gold,cursor:"pointer",fontFamily:font,fontWeight:500}}>
            Dari Data Pengajuan
          </button>}
          </div>
        </td></tr>}
      </tbody>
    </table>
  </div>;
}

// ─── Import Excel Modal ──────────────────────────────────────────────────────
function ProdukImportModal({ onImport, onClose }) {
  const { t } = useLang();
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setParsing(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const mapped = data.map(row => {
        const name = row['Nama Produk'] || row['nama_produk'] || row['PRODUK'] || row['Produk'];
        return name ? String(name).trim() : null;
      }).filter(Boolean);
      setPreview(mapped);
    } catch (err) {
      setError("Gagal membaca file: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  const border = `1px solid ${C.border}`;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:2000,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:480,
      boxShadow:"0 8px 32px rgba(0,0,0,0.18)",fontFamily:font,overflow:"hidden"}}>
      <div style={{background:C.blue,color:"#fff",padding:"11px 16px",fontWeight:600,fontSize:13,
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>📊 Import Excel — Daftar Produk</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18}}>×</button>
      </div>
      <div style={{padding:16}}>
        {/* Template */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6}}>Template:</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:C.blueLight}}>
              <th style={{border,width:40,padding:"4px 8px"}}>No.</th>
              <th style={{border,padding:"4px 8px"}}>Nama Produk</th>
            </tr></thead>
            <tbody>
              <tr><td style={{border,padding:"4px 8px",textAlign:"center",color:C.faint}}>1</td>
                <td style={{border,padding:"4px 8px"}}>ROTI TAWAR</td></tr>
              <tr><td style={{border,padding:"4px 8px",textAlign:"center",color:C.faint}}>2</td>
                <td style={{border,padding:"4px 8px"}}>KERIPIK SINGKONG</td></tr>
            </tbody>
          </table>
        </div>

        {/* Upload */}
        <div style={{border:`2px dashed ${C.border}`,borderRadius:6,padding:24,textAlign:"center",marginBottom:14,
          background:C.bgAlt,cursor:"pointer"}}
          onClick={()=>document.getElementById("produk-excel-input")?.click()}>
          <div style={{fontSize:28,marginBottom:6}}>📁</div>
          <div style={{fontSize:12,color:C.muted}}>Klik untuk upload file Excel (.xlsx / .xls)</div>
          <input id="produk-excel-input" type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleFile}/>
        </div>

        {parsing&&<div style={{fontSize:12,color:C.blue,textAlign:"center",padding:8}}>⏳ Membaca file...</div>}
        {error&&<div style={{fontSize:12,color:C.red,textAlign:"center",padding:8}}>{error}</div>}

        {/* Preview */}
        {preview!==null&&!parsing&&<div>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6,display:"flex",justifyContent:"space-between"}}>
            <span>Preview ({preview.length} produk):</span>
          </div>
          <div style={{maxHeight:180,overflowY:"auto",border:border,borderRadius:4,marginBottom:12}}>
            {preview.length===0
              ? <div style={{padding:12,textAlign:"center",color:C.faint,fontSize:11}}>Tidak ada data ditemukan.</div>
              : preview.slice(0,50).map((name,i)=><div key={i} style={{padding:"4px 10px",fontSize:12,
                  borderBottom:border,background:i%2===0?C.bg:C.bgAlt}}>
                {i+1}. {name}
              </div>)}
            {preview.length>50&&<div style={{padding:"4px 10px",fontSize:11,color:C.muted,textAlign:"center"}}>
              ... dan {preview.length-50} lainnya
            </div>}
          </div>
          <button onClick={()=>{onImport(preview);onClose();}}
            disabled={preview.length===0}
            style={{width:"100%",background:C.blue,color:"#fff",border:"none",borderRadius:4,
              padding:"8px 0",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:font,
              opacity:preview.length===0?0.5:1}}>
            Import {preview.length} Produk
          </button>
        </div>}
      </div>
    </div>
  </div>;
}

// ─── Produk Table ─────────────────────────────────────────────────────────────
function ProdukTable({ canEdit, rows, setRows }) {
  const { t } = useLang();
  const [adding,setAdding]=useState(false);
  const [newNama,setNewNama]=useState("");
  const [showImport,setShowImport]=useState(false);
  const th = {background:C.blue,color:"#fff",fontWeight:500,fontSize:11,padding:"6px 8px",textAlign:"left"};

  return <div style={{fontFamily:font}}>
    {showImport&&<ProdukImportModal
      onImport={(list)=>setRows(r=>[...r,...list.map((nama,i)=>({id:Date.now()+i,nama}))])}
      onClose={()=>setShowImport(false)}/>}
    {canEdit&&<div style={{marginBottom:8,display:"flex",gap:8}} className="print-hide">
      <button onClick={()=>setAdding(true)} style={{background:"transparent",border:`1px dashed ${C.blue}`,
        borderRadius:4,padding:"5px 14px",fontSize:12,color:C.blue,cursor:"pointer",fontFamily:font,fontWeight:500}}>+ Tambah Produk</button>
      <button onClick={()=>setShowImport(true)}
        style={{background:"transparent",border:`1px dashed ${C.gold}`,borderRadius:4,padding:"5px 14px",
          fontSize:12,color:C.gold,cursor:"pointer",fontFamily:font,fontWeight:500}}>
        📊 Import Excel
      </button>
    </div>}
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <colgroup><col style={{width:36}}/><col/>{canEdit&&<col className="aksi-col" style={{width:48}}/>}</colgroup>
      <thead><tr><th style={th}>No.</th><th style={th}>Nama Produk</th>{canEdit&&<th style={{...th,textAlign:"center"}} className="aksi-col">Aksi</th>}</tr></thead>
      <tbody>
        {rows.map((r,i)=><tr key={r.id} style={{background:i%2===0?C.bg:C.bgAlt}}>
          <td style={{padding:"5px 8px",textAlign:"center",color:C.faint,fontSize:11}}>{i+1}</td>
          <td style={{padding:"5px 8px"}}>{r.nama}</td>
          {canEdit&&<td style={{padding:"4px 6px",textAlign:"center"}} className="aksi-col">
            <IconBtn title="Hapus" color="red" onClick={()=>setRows(rr=>rr.filter(x=>x.id!==r.id))}>🗑</IconBtn>
          </td>}
        </tr>)}
        {canEdit&&adding&&<tr className="tambah-row"><td colSpan={3} style={{padding:"6px 8px",borderTop:`1px dashed ${C.border}`}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={newNama} onChange={e=>setNewNama(e.target.value)} autoFocus
              placeholder="Nama produk..." onKeyDown={e=>{if(e.key==="Enter"&&newNama.trim()){setRows(r=>[...r,{id:Date.now(),nama:newNama.trim()}]);setNewNama("");setAdding(false);}if(e.key==="Escape"){setAdding(false);setNewNama("");}}}
              style={{flex:1,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 8px",fontSize:12,fontFamily:font}}/>
            <button onClick={()=>{if(newNama.trim()){setRows(r=>[...r,{id:Date.now(),nama:newNama.trim()}]);setNewNama("");setAdding(false);}}}
              style={{background:C.blue,color:"#fff",border:"none",borderRadius:4,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>✓</button>
            <button onClick={()=>{setAdding(false);setNewNama("");}}
              style={{background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:font}}>✕</button>
          </div>
        </td></tr>}
      </tbody>
    </table>
  </div>;
}

// ─── Tim Auditor Tanda Tangan (bottom of report) ──────────────────────────────
// ─── TTD Picker Modal (shared) ──────────────────────────────────────────────
function TtdPickerModal({ regId, onSelect, onClose }) {
  const { t } = useLang();
  const [sigs, setSigs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const v = await api.getState(`ttd_extracted_${regId}`).then(r => r.value);
      if (v) { try { setSigs(JSON.parse(v)); } catch {} }
      setLoading(false);
    })();
  }, [regId]);
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:520,maxHeight:"80vh",overflow:"auto",
      boxShadow:"0 8px 32px rgba(0,0,0,0.18)",border:`1px solid ${C.border}`}}>
      <div style={{background:C.blue,color:"#fff",padding:"11px 16px",borderRadius:"8px 8px 0 0",
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontWeight:600,fontSize:13}}>✍ Pilih Tanda Tangan</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18}}>×</button>
      </div>
      <div style={{padding:16}}>
        {loading ? <div style={{textAlign:"center",color:C.muted,padding:20}}>Memuat...</div>
        : sigs.length === 0 ? <div style={{textAlign:"center",color:C.muted,padding:20}}>
            Belum ada TTD yang diekstrak. Upload dan ekstrak di tab <strong>Dokumentasi → Ekstrak TTD</strong>.
          </div>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {sigs.map(s => (
              <div key={s.id} onClick={() => onSelect(s.dataUrl)}
                style={{cursor:"pointer",border:`1px solid ${C.borderLight}`,borderRadius:6,padding:8,textAlign:"center",
                  transition:"all 0.15s",background:C.bg}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.background=C.blueSoft}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderLight;e.currentTarget.style.background=C.bg}}>
                <img src={s.dataUrl} alt={s.label} style={{width:"100%",height:50,objectFit:"contain",marginBottom:4}} />
                <div style={{fontSize:10,fontWeight:600,color:C.text}}>{s.label}</div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  </div>;
}

function TimAuditorTTD({ rows, setRows, auditors, ttdAssign, onAssignTtd, canEdit, regId }) {
  const { t } = useLang();
  const [pickerRow, setPickerRow] = useState(null);
  const AUDITORS_CONST = auditors || [];
  const th = {background:C.blue,color:"#fff",fontWeight:500,fontSize:11,padding:"7px 10px",textAlign:"left"};

  const setCell = (id, field, val) => setRows(prev => prev.map(r => r.id===id ? {...r, [field]:val} : r));
  const deleteRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  return <div style={{fontFamily:font}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr>
        <th style={{...th,width:28}}>No.</th>
        <th style={th}>Nama Auditor</th>
        <th style={th}>Peran</th>
        <th style={{...th,width:160}}>Tanda Tangan</th>
        {canEdit && <th style={{...th,width:36,textAlign:"center"}} className="print-hide">Aksi</th>}
      </tr></thead>
      <tbody>{rows.map((r,i)=><tr key={r.id} style={{background:i%2===0?C.bg:C.bgAlt}}>
        <td style={{padding:"14px 10px",textAlign:"center",color:C.faint,fontSize:11}}>{i+1}</td>
        <td style={{padding:"14px 10px"}}>
          {canEdit ? (
            <input value={r.nama} onChange={e=>setCell(r.id,"nama",e.target.value)}
              placeholder="Nama auditor"
              list="auditor-list"
              style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 8px",fontSize:12,fontFamily:font,outline:"none",boxSizing:"border-box"}} />
          ) : (
            <span style={{fontWeight:500}}>{r.nama || "—"}</span>
          )}
        </td>
        <td style={{padding:"14px 10px"}}>
          {canEdit ? (
            <select value={r.peran} onChange={e=>setCell(r.id,"peran",e.target.value)}
              style={{border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 8px",fontSize:12,fontFamily:font,outline:"none"}}>
              <option value="Lead Auditor">Lead Auditor</option>
              <option value="Auditor">Auditor</option>
              <option value="Observer">Observer</option>
            </select>
          ) : (
            <Badge color={r.peran==="Lead Auditor"?"blue":"gray"}>{r.peran}</Badge>
          )}
        </td>
        <td style={{padding:"8px 10px",borderLeft:`1px solid ${C.borderLight}`}}>
          {ttdAssign["ta_"+r.id] ? (
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <img src={ttdAssign["ta_"+r.id]} alt="TTD" style={{height:32,objectFit:"contain"}} />
              <button onClick={()=>onAssignTtd("ta_"+r.id,null)} title="Hapus" className="print-hide"
                style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:10}}>✕</button>
            </div>
          ) : (
            canEdit && <button onClick={()=>setPickerRow(r.id)} title="Pilih TTD" className="print-hide"
              style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:3,padding:"3px 8px",fontSize:10,
                color:C.muted,cursor:"pointer",fontFamily:font}}>Pilih TTD</button>
          )}
        </td>
        {canEdit && <td style={{padding:"8px 6px",textAlign:"center"}} className="print-hide">
          <button onClick={()=>deleteRow(r.id)} title="Hapus baris"
            style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:2,lineHeight:1}}>✕</button>
        </td>}
      </tr>)}</tbody>
    </table>
    {canEdit && <div style={{marginTop:8}}>
      <button onClick={()=>setRows(prev=>[...prev,{id:Date.now(),nama:"",peran:"Auditor"}])} className="print-hide"
        style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:4,padding:"4px 12px",fontSize:11,color:C.muted,cursor:"pointer",fontFamily:font}}>+ Tambah Baris</button>
    </div>}
    {/* Hidden datalist for auditor name autocomplete */}
    {canEdit && <datalist id="auditor-list">
      {AUDITORS_CONST.map(a=><option key={a.id} value={a.nama} />)}
    </datalist>}
    {pickerRow && <TtdPickerModal regId={regId} onSelect={dataUrl=>{onAssignTtd("ta_"+pickerRow,dataUrl);setPickerRow(null);}} onClose={()=>setPickerRow(null)} />}
  </div>;
}

// ─── Perwakilan Perusahaan Table ────────────────────────────────────────────
function PerwakilanTable({ rows, setRows, canEdit, regId, ttdAssign, onAssignTtd }) {
  const { t } = useLang();
  const [pickerRow, setPickerRow] = useState(null);
  const th = {background:C.blue,color:"#fff",fontWeight:500,fontSize:11,padding:"7px 10px",textAlign:"left"};
  const setCell = (id, field, val) => setRows(prev => prev.map(r => r.id===id?{...r,[field]:val}:r));
  const deleteRow = (id) => setRows(prev => prev.filter(r => r.id !== id));
  return <div style={{fontFamily:font}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr>
        <th style={{...th,width:28}}>No.</th>
        <th style={th}>Nama</th>
        <th style={th}>Jabatan</th>
        <th style={{...th,width:160}}>Tanda Tangan</th>
        {canEdit && <th style={{...th,width:36,textAlign:"center"}} className="print-hide">Aksi</th>}
      </tr></thead>
      <tbody>{rows.map((r,i)=><tr key={r.id} style={{background:i%2===0?C.bg:C.bgAlt}}>
        <td style={{padding:"14px 10px",textAlign:"center",color:C.faint,fontSize:11}}>{i+1}</td>
        <td style={{padding:"14px 10px"}}>
          {canEdit ? (
            <input value={r.nama} onChange={e=>setCell(r.id,"nama",e.target.value)}
              placeholder="Nama perwakilan"
              style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 8px",fontSize:12,fontFamily:font,outline:"none",boxSizing:"border-box"}} />
          ) : (
            <span style={{fontWeight:500}}>{r.nama || "—"}</span>
          )}
        </td>
        <td style={{padding:"14px 10px"}}>
          {canEdit ? (
            <input value={r.jabatan} onChange={e=>setCell(r.id,"jabatan",e.target.value)}
              placeholder="Jabatan"
              style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 8px",fontSize:12,fontFamily:font,outline:"none",boxSizing:"border-box"}} />
          ) : (
            <span style={{color:C.muted,fontSize:12}}>{r.jabatan || "—"}</span>
          )}
        </td>
        <td style={{padding:"8px 10px",borderLeft:`1px solid ${C.borderLight}`}}>
          {ttdAssign["pw_"+r.id] ? (
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <img src={ttdAssign["pw_"+r.id]} alt="TTD" style={{height:32,objectFit:"contain"}} />
              <button onClick={()=>onAssignTtd("pw_"+r.id,null)} title="Hapus" className="print-hide"
                style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:10}}>✕</button>
            </div>
          ) : (
            canEdit && <button onClick={()=>setPickerRow(r.id)} title="Pilih TTD"
              style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:3,padding:"3px 8px",fontSize:10,
                color:C.muted,cursor:"pointer",fontFamily:font}}>Pilih TTD</button>
          )}
        </td>
        {canEdit && <td style={{padding:"8px 6px",textAlign:"center"}} className="print-hide">
          <button onClick={()=>deleteRow(r.id)} title="Hapus baris"
            style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:2,lineHeight:1}}>✕</button>
        </td>}
      </tr>)}</tbody>
    </table>
    {canEdit && <div style={{marginTop:8}}>
      <button onClick={()=>setRows(prev=>[...prev,{id:Date.now(),nama:"",jabatan:""}])} className="print-hide"
        style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:4,padding:"4px 12px",fontSize:11,color:C.muted,cursor:"pointer",fontFamily:font}}>+ Tambah Baris</button>
    </div>}
    {pickerRow && <TtdPickerModal regId={regId} onSelect={dataUrl=>{onAssignTtd("pw_"+pickerRow,dataUrl);setPickerRow(null);}} onClose={()=>setPickerRow(null)} />}
  </div>;
}

// ─── Profile Table (top of report) ───────────────────────────────────────────
function ProfileTable({ reg, mode, canEdit, auditors, namaPemilik, onNamaPemilikChange }) {
  const { t } = useLang();
  const AUDITORS_CONST = auditors || [];
  const getA = id => AUDITORS_CONST.find(a=>a.id===id)?.nama||"—";

  const rows = [
    ["Nama Perusahaan", reg?.namaPU],
    ["Nama Pemilik", canEdit
      ? <input value={namaPemilik || ""} onChange={e => onNamaPemilikChange(e.target.value)}
          style={{width:"100%",border:"none",background:"transparent",font:"inherit",fontWeight:500,fontSize:13,padding:0,outline:"none"}}
          placeholder="Nama pemilik usaha" />
      : (namaPemilik || "—")],
    ["Agama Pemilik", reg?.agamaPemilik || "—"],
    ["Nomor Pendaftaran", <span style={{fontFamily:mono,fontSize:12}}>{reg?.id}</span>],
    ["Alamat Perusahaan", reg?.alamat],
    ["Jenis Produk", reg?.jenisProduk],
    ["Jenis Pendaftaran", reg?.jenisPendaftaran],
    ["Tanggal Audit", reg?.tanggalAudit ? fmtDateLong(reg.tanggalAudit) : <Badge color="gold">Belum dijadwalkan</Badge>],
    ["Lead Auditor", getA(reg?.leadAuditor)],
    ["Auditor", getA(reg?.auditor)],
    reg?.auditor2 && ["Auditor 2", getA(reg.auditor2)],
    reg?.auditor3 && ["Auditor 3", getA(reg.auditor3)],
    reg?.observer && ["Observer", reg.observer],
  ].filter(Boolean);

  return <table style={{width:"100%",borderCollapse:"collapse",marginBottom:4}}>
    <tbody>{rows.map(([label,value],i)=><tr key={i} style={{background:i%2!==0?C.bg:C.bgAlt}}>
      <td style={{padding:"5px 8px",color:C.muted,width:160,whiteSpace:"nowrap",fontSize:13}}>{label}</td>
      <td style={{padding:"5px 8px",color:C.muted,width:12,fontSize:13}}>:</td>
      <td style={{padding:"5px 8px",fontWeight:500,fontSize:13}}>{value||"—"}</td>
    </tr>)}</tbody>
  </table>;
}

// ─── Section header ───────────────────────────────────────────────────────────
function SecHdr({ children }) {
  return <div style={{fontSize:11,fontWeight:600,color:C.blue,letterSpacing:"0.06em",
    textTransform:"uppercase",padding:"6px 0",margin:"20px 0 10px",
    borderBottom:`1.5px solid ${C.blueLight}`}}>{children}</div>;
}

// ─── Letterhead (used at top of report and before each page break) ────────────
function LH() {
  return <div style={{padding:"18px 32px 14px",display:"flex",alignItems:"center",gap:20,
    borderBottom:`2px solid ${C.blue}`,position:"relative",overflow:"hidden"}}>
    <img src={cornerLogoSrc} alt="" style={{position:"absolute",top:0,right:0,width:72,opacity:0.7}}/>
    <img src={logoSrc} alt="LPH UIN" style={{width:72,height:72,objectFit:"contain",flexShrink:0}}/>
    <div style={{flex:1}}>
      <div style={{fontSize:16,fontWeight:700,color:C.blue}}>LEMBAGA PEMERIKSA HALAL</div>
      <div style={{fontSize:15,fontWeight:700,color:C.blue}}>UIN SYARIF HIDAYATULLAH JAKARTA</div>
      <div style={{fontSize:11,color:C.muted,marginTop:5,lineHeight:1.5,borderTop:`1px solid #dce8f8`,paddingTop:5}}>
        Gedung Wisma Usaha UIN Syarif Hidayatullah Jakarta Lantai 3, Jl. Ir H. Juanda No. 95, Cempaka Putih, Ciputat, Tangerang Selatan, Banten 15412
        <br/>Telp: 08971740444 &nbsp;·&nbsp; Email: lph@apps.uinjkt.ac.id
      </div>
    </div>
  </div>;
}

// ─── Lampiran Image Picker Modal ────────────────────────────────────────────
function LampiranPickerModal({ regId, onSelect, onClose }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    (async () => {
      const imgs = [];
      const loadFrom = async (key, source) => {
        const v = await api.getState(key).then(r => r.value);
        if (!v) return;
        const docs = Array.isArray(v) ? v : (typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return []; } })() : []);
        for (const d of docs) {
          // Skip PDFs
          if (d.type === "pdf") continue;
          // Determine if this entry has inline data or needs lazy loading
          const inlineData = d.snapshot || d.data || d.image; // full image data (old format)
          const thumb = d.thumbnail || inlineData; // thumbnail for grid display
          const hasInline = inlineData && inlineData.length > 1000; // reasonable image size
          if (thumb) {
            imgs.push({
              ...d,
              data: thumb,
              fullData: hasInline ? inlineData : null,
              source,
              needsLoad: !hasInline, // new format (no inline image) needs lazy load
            });
          }
        }
      };
      await loadFrom(`dok_pendukung_${regId}`, "pendukung");
      await loadFrom(`dok_fasilitas_${regId}`, "fasilitas");
      setImages(imgs);
      setLoading(false);
    })();
  }, [regId]);

  const imgKey = (d) => {
    if (d.source === "fasilitas") return `dok_fasilitas_img_${regId}_${d.id}`;
    return `dok_pendukung_img_${regId}_${d.id}`;
  };

  const toggle = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(images.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());
  const addSelected = async () => {
    setAdding(true);
    try {
      const urls = [];
      for (const i of selected) {
        const d = images[i];
        // If needs full load, fetch from individual key
        if (d.needsLoad && !d._loaded) {
          const v = await api.getState(imgKey(d)).then(r => r.value);
          if (v) {
            d._loaded = v;
          }
        }
        urls.push(d._loaded || d.fullData || d.data);
      }
      if (urls.length) onSelect(urls);
    } finally {
      setAdding(false);
    }
  };
  const allSelected = images.length > 0 && selected.size === images.length;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:560,maxHeight:"80vh",display:"flex",flexDirection:"column",
      boxShadow:"0 8px 32px rgba(0,0,0,0.18)",border:`1px solid ${C.border}`}}>
      <div style={{background:C.blue,color:"#fff",padding:"11px 16px",borderRadius:"8px 8px 0 0",flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontWeight:600,fontSize:13}}>🖼 Pilih Gambar dari Dokumentasi</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18}}>×</button>
      </div>
      <div style={{padding:16,overflow:"auto",flex:1}}>
        {loading ? <div style={{textAlign:"center",color:C.muted,padding:20}}>Memuat...</div>
        : images.length === 0 ? <div style={{textAlign:"center",color:C.muted,padding:20}}>
            Belum ada gambar di Dokumentasi. Upload gambar terlebih dahulu di tab Dokumentasi.
          </div>
        : <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <button onClick={allSelected ? deselectAll : selectAll}
              style={{background:"none",border:"none",color:C.blue,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:font}}>
              {allSelected ? "✕ Batal Semua" : "☐ Pilih Semua"}
            </button>
            <span style={{fontSize:11,color:C.muted}}>{selected.size} dipilih</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {images.map((d, i) => {
              const sel = selected.has(i);
              return <div key={d.id} onClick={() => toggle(i)}
                style={{cursor:"pointer",border:`2px solid ${sel ? C.blue : C.borderLight}`,borderRadius:6,padding:6,textAlign:"center",
                  transition:"all 0.15s",background:sel ? C.blueSoft : C.bg,position:"relative"}}>
                <img src={d.data} alt={d.label || d.name || ""} style={{width:"100%",height:60,objectFit:"cover",borderRadius:3,marginBottom:4}} />
                <div style={{fontSize:10,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label || d.name}</div>
                <div style={{position:"absolute",top:4,right:4,width:18,height:18,borderRadius:"50%",
                  background:sel?C.blue:C.bg,border:`2px solid ${sel?C.blue:C.borderLight}`,
                  color:sel?"#fff":"transparent",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all 0.15s"}}>{sel?"✓":""}</div>
              </div>;
            })}
          </div>
        </>}
      </div>
      {images.length > 0 && !loading && (
        <div style={{padding:"10px 16px",borderTop:`1px solid ${C.borderLight}`,flexShrink:0,display:"flex",justifyContent:"flex-end"}}>
          <button onClick={addSelected} disabled={selected.size === 0 || adding}
            style={{background:selected.size===0?C.borderLight:C.blue,color:"#fff",border:"none",borderRadius:5,
              padding:"6px 16px",fontSize:12,fontWeight:600,cursor:selected.size===0?"not-allowed":"pointer",fontFamily:font}}>
            {adding ? "Memuat..." : `+ Tambah ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </button>
        </div>
      )}
    </div>
  </div>;
}

// ─── Atur Foto Modal ──────────────────────────────────────────────────────────
function AturFotoModal({ itemName, photos, onSave, onClose }) {
  const [items, setItems] = useState(() => photos.map(toEntry));
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const setSize = (idx, size) => {
    setItems(prev => prev.map((p, i) => i === idx ? { ...p, size } : p));
  };

  const remove = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => setDragOverIdx(null);

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    setDragOverIdx(null);
    setDragIdx(null);
    if (dragIdx === null || dragIdx === targetIdx) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:1100,padding:16}}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{background:C.bg,borderRadius:8,width:"100%",maxWidth:620,maxHeight:"85vh",display:"flex",flexDirection:"column",
        boxShadow:"0 12px 40px rgba(0,0,0,0.2)",border:`1px solid ${C.border}`}}>
        <div style={{background:C.blue,color:"#fff",padding:"11px 16px",borderRadius:"8px 8px 0 0",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontWeight:600,fontSize:13}}>🖼 Atur Foto — {itemName}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18}}>×</button>
        </div>
        <div style={{padding:16,overflow:"auto",flex:1}}>
          {items.length === 0 ? (
            <div style={{textAlign:"center",color:C.muted,padding:30,fontSize:12}}>Tidak ada foto.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {items.map((p, idx) => (
                <div key={idx}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display:"flex",alignItems:"center",gap:10,
                    padding:"8px 10px",border:`1px solid ${dragOverIdx === idx ? C.blue : C.borderLight}`,
                    borderRadius:6,background:dragIdx===idx?"#e8f0fe":C.bg,
                    transition:"all 0.15s",cursor:"grab",
                    boxShadow: dragOverIdx === idx ? `0 0 0 2px ${C.blue}40` : "none",
                  }}>
                  {/* Drag handle */}
                  <div style={{fontSize:18,color:C.faint,cursor:"grab",lineHeight:1,userSelect:"none"}}>⠿</div>
                  {/* Thumbnail */}
                  <img src={p.url} alt=""
                    style={{width:60,height:60,objectFit:"cover",borderRadius:4,border:`1px solid ${C.borderLight}`,flexShrink:0}} />
                  {/* Info + size controls */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:500,color:C.text,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      Foto #{idx + 1}
                    </div>
                    <div style={{display:"flex",gap:2}}>
                      {["s","m","l"].map(size => {
                        const active = p.size === size;
                        return (
                          <button key={size} onClick={() => setSize(idx, size)}
                            style={{
                              padding:"2px 8px",border:`1px solid ${active ? C.blue : C.borderLight}`,
                              borderRadius:3,background:active?C.blue:C.bg,
                              color:active?"#fff":C.muted,fontSize:10,fontWeight:active?600:400,
                              cursor:"pointer",fontFamily:font,transition:"all 0.1s",
                            }}>{size.toUpperCase()}</button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Delete */}
                  <button onClick={() => remove(idx)}
                    style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:4,lineHeight:1,flexShrink:0}}
                    title="Hapus foto">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{padding:"10px 16px",borderTop:`1px solid ${C.borderLight}`,flexShrink:0,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:10,color:C.faint}}>Seret ⠿ untuk mengurutkan ulang</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose}
              style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,padding:"6px 14px",fontSize:11,
                color:C.muted,cursor:"pointer",fontFamily:font}}>Batal</button>
            <button onClick={handleSave}
              style={{background:C.blue,color:"#fff",border:"none",borderRadius:5,padding:"6px 16px",fontSize:11,
                fontWeight:600,cursor:"pointer",fontFamily:font}}>Simpan</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lampiran section ─────────────────────────────────────────────────────────
function LampiranSection({ regId, lampiranImgs, onAssignLampiran, lampiranItems, onUpdateItems, canEdit }) {
  const [pickerIdx, setPickerIdx] = useState(null);
  const [aturIdx, setAturIdx] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const items = lampiranItems || ["Foto Audit","Sertifikat Penyelia Halal","Poster Kebijakan Halal","Denah Lokasi Produksi","Diagram Alir Produksi"];
  const imgs = lampiranImgs || {};
  return <div style={{marginTop:24}}>
    {items.map((item,i)=><div key={i} className="lampiran-item" style={{padding:"10px 14px",border:`1px solid ${C.borderLight}`,
      borderRadius:5,marginBottom:8,background:C.bgAlt}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontWeight:600,fontSize:12}}>Lampiran {item}</span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>{const n=items.filter((_,j)=>j!==i);onUpdateItems(n);}} title="Hapus lampiran" className="print-hide"
            style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:11,fontFamily:font}}>✕</button>
        </div>
      </div>
      {(imgs[i] && imgs[i].length > 0) && (
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8,marginBottom:8}}>
          {imgs[i].map((p, pi) => {
            const entry = toEntry(p);
            const url = entry.url;
            const sz = entry.size || "m";
            const width = sz === "s" ? "calc(33.333% - 6px)" : sz === "m" ? "calc(50% - 4px)" : "100%";
            return (
            <div key={pi} style={{position:"relative",width,maxWidth:width}}>
              <img src={url} alt={`Lampiran ${item} #${pi+1}`}
                onClick={()=>setPreviewUrl(url)}
                style={{width:"100%",height:"auto",maxHeight:"none",objectFit:"contain",borderRadius:4,border:`1px solid ${C.borderLight}`,cursor:"pointer",background:"#fafafa"}} />
              <button onClick={()=>{const n=[...imgs[i]];n.splice(pi,1);const upd={...imgs};if(n.length)upd[i]=n;else delete upd[i];onAssignLampiran(upd);}} title="Hapus foto" className="print-hide"
                style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",
                  background:C.red,color:"#fff",border:"none",fontSize:9,cursor:"pointer",lineHeight:1}}>✕</button>
            </div>
          );})}
        </div>
      )}
      {canEdit && (
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={()=>setPickerIdx(i)} title="Tambah foto" className="print-hide"
            style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:4,padding:"3px 10px",fontSize:11,
              color:C.muted,cursor:"pointer",fontFamily:font}}>+ Tambah Foto</button>
          {imgs[i] && imgs[i].length > 0 && (
            <button onClick={()=>setAturIdx(i)} title="Atur ulang foto" className="print-hide"
              style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:4,padding:"3px 10px",fontSize:11,
                color:C.muted,cursor:"pointer",fontFamily:font}}>Atur Foto</button>
          )}
        </div>
      )}
    </div>)}
    {canEdit && (
      <button onClick={()=>{const name=prompt("Nama lampiran baru:");if(name)onUpdateItems([...items,name]);}} className="print-hide"
        style={{marginTop:4,background:"none",border:`1px dashed ${C.blue}`,borderRadius:5,padding:"6px 14px",fontSize:12,
          color:C.blue,cursor:"pointer",fontFamily:font,fontWeight:600}}>+ Tambah Lampiran</button>
    )}
    {pickerIdx !== null && <LampiranPickerModal regId={regId}
      onSelect={dataUrls=>{
        const upd = {...imgs};
        upd[pickerIdx] = [...(imgs[pickerIdx]||[]), ...dataUrls];
        onAssignLampiran(upd);
        setPickerIdx(null);
      }}
      onClose={()=>setPickerIdx(null)} />}
    {aturIdx !== null && (
      <AturFotoModal
        itemName={items[aturIdx]}
        photos={imgs[aturIdx] || []}
        onSave={entries => {
          const upd = {...imgs};
          if (entries.length) upd[aturIdx] = entries;
          else delete upd[aturIdx];
          onAssignLampiran(upd);
        }}
        onClose={() => setAturIdx(null)}
      />
    )}
    {previewUrl && <ImagePreviewModal url={previewUrl} onClose={()=>setPreviewUrl(null)} />}
  </div>;
}

function ImagePreviewModal({ url, onClose }) {
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:3000,padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"none",border:"none",color:"#fff",fontSize:24,cursor:"pointer"}}>×</button>
    <img src={url} alt="Preview" style={{maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8}} />
  </div>;
}

// ─── Main Report Editor ───────────────────────────────────────────────────────
export default function HARSReportEditor({ reg, role, auditors }) {
  const { t } = useLang();
  const canEdit = role === "auditor" || role === "admin";
  const [verdict,setVerdict]=useState("lulus");
  const [fasilitasRows,setFasilitasRows]=useState([{id:1,nama:reg?.namaPabrik||"",alamat:reg?.alamatPabrik||"",kota:reg?.fasilitasKota||"",negara:reg?.fasilitasNegara||"Indonesia"}]);
  const [penyeliaRows,setPenyeliaRows]=useState([{id:1,nama:reg?.penyeliaHalal||"",noKTP:reg?.penyeliaNoKTP||"",noSertifikat:reg?.penyeliaNoSertifikat||"",noSK:reg?.penyeliaNoSK||"",noKontak:reg?.penyeliaNoKontak||""}]);
  const [produkRows,setProdukRows]=useState([]);
  const [bahanRows,setBahanRows]=useState(INITIAL_BAHAN);
  const [kriteriaRows,setKriteriaRows]=useState(KRITERIA_SKELETON);
  const [perwakilanRows,setPerwakilanRows]=useState([
    {id:1,nama:"",jabatan:"Pemilik/Direktur"},
    {id:2,nama:"",jabatan:"Penyelia Halal"},
    {id:3,nama:"",jabatan:"Manager Produksi"},
  ]);
  const [savedFeedback,setSavedFeedback]=useState(false);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [ttdAssign, setTtdAssign] = useState({});
  const [lampiranImgs, setLampiranImgs] = useState({}); // { [idx]: [url, url, ...] }
  const [namaPemilik, setNamaPemilik] = useState(reg?.namaPU || "");
  const [lampiranItems, setLampiranItems] = useState(null); // null = use defaults
  const [printing, setPrinting] = useState(false);
  // Build initial tim auditor rows from reg, deduplicating by auditor id
  const buildInitialTimAuditor = () => {
    const AUDITORS_CONST = auditors || [];
    const getA = id => AUDITORS_CONST.find(a=>a.id===id);
    const seen = new Set();
    const rows = [];
    const add = (auditorId, peran, fallbackNama) => {
      const a = getA(auditorId);
      const nama = a?.nama || fallbackNama || "";
      const dedupKey = auditorId || nama;
      if (dedupKey && seen.has(dedupKey)) return;
      if (dedupKey) seen.add(dedupKey);
      rows.push({id:Date.now()+rows.length,nama,peran});
    };
    if (reg?.leadAuditor) add(reg.leadAuditor, "Lead Auditor");
    if (reg?.auditor) add(reg.auditor, "Auditor");
    if (reg?.auditor2) add(reg.auditor2, "Auditor");
    if (reg?.auditor3) add(reg.auditor3, "Auditor");
    if (reg?.observer) {
      if (!seen.has(reg.observer)) rows.push({id:Date.now()+rows.length,nama:reg.observer,peran:"Observer"});
    }
    return rows.length > 0 ? rows : [{id:1,nama:"",peran:"Lead Auditor"},{id:2,nama:"",peran:"Auditor"}];
  };
  const [timAuditorRows, setTimAuditorRows] = useState(buildInitialTimAuditor);
  const docRef = useRef(null);
  const replacementsRef = useRef([]);

  const handlePrint = () => {
    const el = docRef.current || document.getElementById("report-document");
    if (!el) { alert("Dokumen laporan belum siap. Coba beberapa saat lagi."); return; }

    // Replace form controls with plain text for clean printing
    const replacements = [];
    el.querySelectorAll("input, textarea, select").forEach(input => {
      const span = document.createElement("span");
      if (input.tagName === "SELECT") {
        span.textContent = input.options[input.selectedIndex]?.text || "";
      } else {
        span.textContent = input.value || input.placeholder || "";
      }
      span.style.display = "block";
      span.style.fontFamily = "inherit";
      span.style.fontSize = "inherit";
      span.style.color = "#1a1a1a";
      span.style.whiteSpace = "pre-wrap";
      span.style.wordBreak = "break-word";
      span.style.overflow = "visible";
      span.style.height = "auto";
      span.style.width = "100%";
      span.className = "print-only";
      if (input.parentNode) {
        // Remove existing .print-only sibling to avoid duplicate text
        const existingPrint = input.parentNode.querySelector(".print-only");
        if (existingPrint) existingPrint.remove();
        input.parentNode.replaceChild(span, input);
        replacements.push({ span, input });
      }
    });
    replacementsRef.current = replacements;

    // Show remaining .print-only elements (e.g. standalone ones)
    el.querySelectorAll(".print-only").forEach(el => {
      el.style.display = "block";
    });

    setPrinting(true);

    // Use browser native print (uses @media print CSS injected above)
    window.print();

    // Restore DOM after print dialog closes
    const restore = () => {
      const reps = replacementsRef.current;
      reps.forEach(({ span, input }) => {
        if (span.parentNode) span.parentNode.replaceChild(input, span);
      });
      replacementsRef.current = [];
      el.querySelectorAll(".print-only").forEach(el => {
        el.style.display = "";
      });
      setPrinting(false);
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    // Fallback: if afterprint doesn't fire (some browsers), restore after a delay
    setTimeout(() => {
      if (replacementsRef.current.length > 0) restore();
    }, 2000);
  };


  // Inject @media print styles so Ctrl+P / native print works as fallback
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "hars-print-styles";
    style.textContent = `@media print{
@page{margin:15mm 0}
html{background:#fff!important}
body,#root{background:#fff!important;margin:0!important;padding:0!important}
.print-hide,.screen-ta,.aksi-col,.tambah-row{display:none!important}
.print-only{display:block!important}
#ws-chrome{display:none!important}
#hars-outer{min-height:0!important;background:#fff!important}
#hars-outer nav,#hars-outer>nav,.hd-top{display:none!important}
.hars-report-nav{display:none!important}
#report-document{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:none!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;background:#fff!important}
.print-content{padding:0 10mm!important}
select{-webkit-appearance:none;appearance:none;border:none!important;background:transparent!important;color:#1a1a1a!important}
*{print-color-adjust:exact;-webkit-print-color-adjust:exact}
}`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  // Load saved report data
  useEffect(() => {
    if (!reg?.id) return;
    setDataLoaded(false);
    (async () => {
      try {
        const saved = await api.getReport(reg.id);
        if (saved.verdict) setVerdict(saved.verdict);
        else if (saved.lulus !== undefined) setVerdict(saved.lulus ? "lulus" : "tidak_lulus");
        const d = saved.data_json || {};
        if (d.namaPemilik !== undefined) setNamaPemilik(d.namaPemilik);
        if (d.fasilitas) {
          setFasilitasRows(d.fasilitas);
        } else {
          // Fallback: load facilities from Data Pengajuan tab
          try {
            const fasState = await api.getState("fasilitas_" + reg.id).then(r => r.value);
            if (fasState && Array.isArray(fasState) && fasState.length > 0) {
              setFasilitasRows(fasState.map((f, i) => ({
                id: i + 1, nama: f.nama || "", alamat: f.alamat || "", kota: f.kota || "", negara: f.negara || "Indonesia"
              })));
            }
          } catch {}
        }
        if (d.penyelia) setPenyeliaRows(d.penyelia);
        if (d.produk) setProdukRows(d.produk);
        if (d.bahan) setBahanRows(d.bahan);
        if (d.kriteria) {
          setKriteriaRows(KRITERIA_SKELETON.map(sk => {
            const sv = d.kriteria.find(s => s.id === sk.id);
            return sv && sv.catatan ? sv : sk;
          }));
        }
        if (d.perwakilan && d.perwakilan.length) setPerwakilanRows(d.perwakilan);
        if (d.timAuditor && d.timAuditor.length) setTimAuditorRows(d.timAuditor);
        if (d.ttdAssign) setTtdAssign(d.ttdAssign);
        if (d.lampiranImgs) {
          const migrated = {};
          const toLoad = [];
          let hasInlineData = false;
          for (const [k, v] of Object.entries(d.lampiranImgs)) {
            const arr = Array.isArray(v) ? v : [v];
            if (arr.length > 0 && typeof arr[0] === 'string' && arr[0].startsWith('lampiran_img_')) {
              toLoad.push((async () => {
                const loaded = await Promise.all(arr.map(async key => {
                  const v = await api.getState(key).then(r => r.value);
                  if (!v) return null;
                  try { return JSON.parse(v); }  // new format: {url, size}
                  catch { return v; }            // old format: bare URL string
                }));
                migrated[k] = loaded.filter(Boolean);
              })());
            } else {
              hasInlineData = true;
              migrated[k] = arr;
            }
          }
          if (toLoad.length) await Promise.all(toLoad);
          setLampiranImgs(migrated);
          // Auto-migrate old format: save images to individual keys now
          if (hasInlineData) {
            const lampiranRefs = {};
            for (const [k, urls] of Object.entries(migrated)) {
              lampiranRefs[k] = [];
              for (let n = 0; n < urls.length; n++) {
                const key = `lampiran_img_${reg.id}_${k}_${n}`;
                lampiranRefs[k].push(key);
                const entry = toEntry(urls[n]);
                if (entry.url && entry.url.startsWith('data:')) {
                  await api.setState(key, JSON.stringify(entry));
                }
              }
            }
            try {
              const curReport = await api.getReport(reg.id);
              await api.saveReport(reg.id, {
                lulus: curReport.lulus, verdict: curReport.verdict || (curReport.lulus ? "lulus" : "tidak_lulus"),
                data_json: { ...d, lampiranImgs: lampiranRefs }, status: curReport.status || "final"
              });
            } catch (migErr) {
              console.warn("Migration save failed, will retry on next save", migErr);
            }
          }
        }
        if (d.lampiranItems) setLampiranItems(d.lampiranItems);
      } catch (e) {
        console.warn("Failed to load report data", e);
      }
      setDataLoaded(true);
    })();
  }, [reg?.id]);

  async function saveReport(status) {
    if (!reg?.id || saving) return;
    setSaving(true);
    try {
      // Store lampiran images individually to avoid bloated data_json
      const lampiranRefs = {};
      for (const [k, urls] of Object.entries(lampiranImgs)) {
        lampiranRefs[k] = [];
        for (let n = 0; n < urls.length; n++) {
          const key = `lampiran_img_${reg.id}_${k}_${n}`;
          lampiranRefs[k].push(key);
          // Serialize entry {url, size} to JSON so metadata persists across save/load
          const entry = toEntry(urls[n]);
          if (entry.url && entry.url.startsWith('data:')) {
            await api.setState(key, JSON.stringify(entry));
          }
        }
      }
      const data_json = {
        namaPemilik,
        fasilitas: fasilitasRows,
        penyelia: penyeliaRows,
        produk: produkRows,
        bahan: bahanRows,
        kriteria: kriteriaRows,
        perwakilan: perwakilanRows,
        timAuditor: timAuditorRows,
        ttdAssign,
        lampiranImgs: lampiranRefs,
        lampiranItems,
      };
      await api.saveReport(reg.id, { lulus: verdict === "lulus", verdict, data_json, status });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (e) {
      console.warn("Failed to save report data", e);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div id="hars-outer" style={{fontFamily:font,minHeight:"100vh",padding:"0 0 48px"}}>
    {/* Sticky nav */}
    <nav className="hars-report-nav" style={{background:C.blue,color:"#fff",padding:"0 24px",display:"flex",
      alignItems:"center",justifyContent:"space-between",height:48,
      position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.04em"}}>HARS</span>
        <span style={{opacity:0.4,fontSize:16}}>|</span>
        <span style={{fontSize:12,opacity:0.85}}>Laporan Audit · {reg?.namaPU||"—"}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>saveReport("final")} disabled={!dataLoaded || saving}
          style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",
          color:"#fff",borderRadius:5,padding:"5px 12px",fontSize:12,fontWeight:600,
          cursor:dataLoaded&&!saving?"pointer":"not-allowed",fontFamily:font,
          display:"flex",alignItems:"center",gap:5,opacity:dataLoaded?1:0.5}}>
          {!dataLoaded ? "⏳ Memuat..."
            : saving ? "⏳ Menyimpan..."
            : <>💾 Simpan{savedFeedback&&<span style={{marginLeft:4}}>✓</span>}</>}
        </button>
        <button type="button" onClick={handlePrint} disabled={printing}
          style={{background:C.gold,border:"none",color:"#fff",
          padding:"5px 14px",borderRadius:5,fontSize:12,fontWeight:600,cursor:printing?"not-allowed":"pointer",fontFamily:font,opacity:printing?0.7:1}}>
          {printing ? "⏳ Mencetak..." : "⎙ Cetak PDF"}
        </button>
      </div>
    </nav>

    {/* Document */}
    <div id="report-document" ref={docRef} style={{maxWidth:860,margin:"24px auto",background:C.bg,
      borderRadius:4,boxShadow:"0 2px 16px rgba(0,0,0,0.10)"}}>

      {/* Letterhead */}
      <LH/>

      {/* Title bar */}
      <div style={{background:C.blue,color:"#fff",textAlign:"center",padding:"14px 32px"}}>
        <div id="doc-title" style={{fontSize:14,fontWeight:600,letterSpacing:"0.04em"}}>{t("auditReportTitle")}</div>
        <div style={{fontSize:12,opacity:0.85,marginTop:2}}>LPH UIN SYARIF HIDAYATULLAH JAKARTA</div>
        <span id="doc-badge" style={{display:"none"}}>LAPORAN HASIL AUDIT</span>
      </div>

      {/* Content */}
      <div style={{padding:"24px 32px"}} className="print-content">
        <SecHdr>{t("companyProfile")}</SecHdr>
        <ProfileTable reg={reg} mode="final" canEdit={canEdit} auditors={auditors} namaPemilik={namaPemilik} onNamaPemilikChange={setNamaPemilik}/>

        <SecHdr>{t("facilityList")}</SecHdr>
        <FasilitasTable reg={reg} mode="final" canEdit={canEdit} rows={fasilitasRows} setRows={setFasilitasRows}/>

        <SecHdr>{t("halalSupervisorCompany")}</SecHdr>
        <PenyeliaTable reg={reg} canEdit={canEdit} rows={penyeliaRows} setRows={setPenyeliaRows}/>

        <div className="pgbrk" style={{pageBreakBefore:"always"}}>
        <SecHdr>{t("productList")}</SecHdr>
        <ProdukTable canEdit={canEdit} rows={produkRows} setRows={setProdukRows}/>
        </div>

        <div className="pgbrk" style={{pageBreakBefore:"always"}}>
        <SecHdr>{t("ingredientList2")}</SecHdr>
        <BahanTable mode="final" canEdit={canEdit} rows={bahanRows} setRows={setBahanRows}/>
        </div>

        <div className="pgbrk" style={{pageBreakBefore:"always"}}>
        <SecHdr>{t("sjphCriteria2")}</SecHdr>
        <KriteriaTable mode="final" canEdit={canEdit} rows={kriteriaRows} setRows={setKriteriaRows}/>
        </div>

        {/* Tim Auditor TTD */}
        <div className="pgbrk" style={{pageBreakBefore:"always"}}>
        <SecHdr>{t("auditorTeam")}</SecHdr>
        <TimAuditorTTD rows={timAuditorRows} setRows={setTimAuditorRows} auditors={auditors} regId={reg?.id}
          ttdAssign={ttdAssign} onAssignTtd={(key,url)=>setTtdAssign(p=>({...p,[key]:url}))} canEdit={canEdit}/>
        </div>

        {/* Perwakilan Perusahaan */}
        <div>
        <SecHdr>Perwakilan Perusahaan</SecHdr>
        <PerwakilanTable rows={perwakilanRows} setRows={setPerwakilanRows} canEdit={canEdit} regId={reg.id}
          ttdAssign={ttdAssign} onAssignTtd={(key,url)=>setTtdAssign(p=>({...p,[key]:url}))}/>
        </div>

        {/* Verdict — cycle through 3 states on click */}
        {(()=>{
          const states = [
            {key:"lulus",label:"LULUS",icon:"✓",color:C.blue,bg:C.blueLight},
            {key:"menunggu_perbaikan",label:"MENUNGGU PERBAIKAN",icon:"⟳",color:"#b8540a",bg:"#fff3e0"},
            {key:"tidak_lulus",label:"TIDAK LULUS",icon:"✗",color:C.red,bg:"#fce4ec"},
          ];
          const cur = states.find(s=>s.key===verdict) || states[0];
          const next = () => { const i = states.findIndex(s=>s.key===verdict); setVerdict(states[(i+1)%3].key); };
          return (
            <div onClick={()=>canEdit&&next()} style={{background:cur.bg,border:`1.5px solid ${cur.color}`,borderRadius:4,
              padding:"12px 20px",margin:"20px 0",display:"flex",alignItems:"center",gap:12,cursor:canEdit?"pointer":"default"}}>
              <span style={{fontSize:24}}>{cur.icon}</span>
              <div>
                <div style={{fontSize:11,color:C.muted}}>Keterangan Laporan Hasil Audit</div>
                <div style={{fontSize:15,fontWeight:600,color:cur.color}}>{cur.label}</div>
              </div>
            </div>
          );
        })()}

        {/* Tanggal & Signature */}
        <div style={{display:"flex",justifyContent:"flex-end",margin:"24px 0 8px"}}>
          <div style={{textAlign:"center",width:260}}>
            <div style={{fontSize:12}}>
              Tangerang Selatan,{" "}
              <span contentEditable suppressContentEditableWarning
                style={{borderBottom:`1px dashed ${C.border}`,minWidth:100,display:"inline-block"}}>
                {reg?.tanggalAudit?fmtDate(reg.tanggalAudit):"__________"}
              </span>
            </div>
            <div style={{fontSize:12,color:C.muted,marginTop:4}}>Diketahui Oleh,<br/>Direktur LPH</div>
            <div style={{ position: "relative", height: "115px", width: "100%", marginBottom: "4px" }}>
              <img src={sigImg} alt="Signature"
                style={{
                  position: "absolute",
                  width: "130px", height: "100px",
                  objectFit: "contain",
                  left: "65px", top: "0px",
                  zIndex: 1,
                }} />
              <img src={stampImg} alt="Stamp"
                style={{
                  position: "absolute",
                  width: "150px", height: "150px",
                  objectFit: "contain",
                  left: "-10px", top: "-10px",
                  zIndex: 2,
                  opacity: 0.9,
                }} />
            </div>
            <span style={{fontWeight:600,fontSize:13,borderTop:`1.5px solid ${C.text}`,
              paddingTop:4,display:"inline-block"}}
              contentEditable suppressContentEditableWarning>
              Dr. Yusraini Dian Inayati Siregar, M.Si.
            </span>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>NIP. 197705122001122002</div>
          </div>
        </div>

        {/* Lampiran — own page when printed */}
        <div className="pgbrk" style={{pageBreakBefore:"always"}}>
        <SecHdr>Lampiran</SecHdr>
        <LampiranSection regId={reg.id} lampiranImgs={lampiranImgs}
          lampiranItems={lampiranItems} onUpdateItems={setLampiranItems}
          onAssignLampiran={setLampiranImgs} canEdit={canEdit} />
        </div>
      </div>
    </div>
  </div></>
}
