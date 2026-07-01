import { useState, useEffect } from "react";
import { useAuth } from "./auth";

const font = "'Plus Jakarta Sans', sans-serif";
const mono = "'JetBrains Mono', monospace";

const C = {
  blue: "#0a6fc0", blueLight: "#cfe5f5", blueMid: "#075aa0",
  gold: "#b8860b", goldLight: "#fdf8e8",
  red: "#c0392b", redLight: "#fce4ec",
  green: "#1b5e20", greenLight: "#e8f5e9",
  text: "#14202b", muted: "#7588a0", faint: "#9aabbf",
  border: "#d9e2ec", borderLight: "#ecf1f6",
  bg: "#fff", bgAlt: "#f6f8fb",
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin LPH" },
  { value: "auditor", label: "Auditor" },
  { value: "observer", label: "Observer" },
];

export default function UserManagement({ onClose }) {
  const { user, listUsers, addUser, updateUser, deleteUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", nama: "", role: "auditor", reg: "" });
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    const u = await listUsers();
    setUsers(u);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const resetForm = () => {
    setForm({ username: "", password: "", nama: "", role: "auditor", reg: "" });
    setShowAdd(false);
    setEditId(null);
    setError("");
  };

  const handleAdd = async () => {
    if (!form.nama.trim() || !form.username.trim() || !form.password) {
      setError("Nama, username, dan password harus diisi");
      return;
    }
    const result = await addUser({
      username: form.username.trim(),
      password: form.password,
      nama: form.nama.trim(),
      role: form.role,
      reg: form.reg.trim(),
    });
    if (!result.ok) { setError(result.error); return; }
    resetForm();
    loadUsers();
  };

  const handleEdit = async () => {
    if (!form.nama.trim()) { setError("Nama harus diisi"); return; }
    const payload = { nama: form.nama.trim(), role: form.role, reg: form.reg.trim() };
    if (form.password) payload.password = form.password;
    await updateUser(editId, payload);
    resetForm();
    loadUsers();
  };

  const handleDelete = async id => {
    if (!confirm("Hapus user ini?")) return;
    await deleteUser(id);
    loadUsers();
  };

  const openEdit = u => {
    setEditId(u.id);
    setForm({ username: u.username, password: "", nama: u.nama, role: u.role, reg: u.reg || "" });
    setShowAdd(false);
    setError("");
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.muted, fontFamily: font }}>Memuat...</div>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
      alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "40px 16px",
      overflowY: "auto" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ fontFamily: font, maxWidth: 840, width: "100%", margin: "0 auto",
      background: C.bg, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ background: C.blue, color: "#fff", padding: "11px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Manajemen User</span>
        <button onClick={onClose} style={{ background: "none", border: "none",
          color: "#fff", cursor: "pointer", fontSize: 20 }}>×</button>
      </div>
      <div style={{ padding: "20px 24px" }}>

      {/* Add button / form */}
      {!showAdd && !editId && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => { setShowAdd(true); setError(""); }} style={{
            background: C.blue, color: "#fff", border: "none", borderRadius: 5,
            padding: "7px 16px", fontSize: 12, fontWeight: 600, fontFamily: font,
            cursor: "pointer",
          }}>+ Tambah User</button>
        </div>
      )}

      {(showAdd || editId) && (
        <div style={{
          border: `1px solid ${C.blue}`, borderRadius: 6,
          padding: "16px 18px", marginBottom: 20, background: C.blueLight,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: C.blue }}>
            {editId ? "Edit User" : "Tambah User Baru"}
          </div>
          {error && (
            <div style={{
              background: C.redLight, color: C.red, borderRadius: 4,
              padding: "6px 10px", fontSize: 12, marginBottom: 10,
            }}>{error}</div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 3 }}>NAMA LENGKAP</label>
              <input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                style={{
                  width: "100%", border: "1px solid #b0cce8", borderRadius: 4,
                  padding: "6px 10px", fontSize: 12, fontFamily: font, boxSizing: "border-box",
                }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 3 }}>USERNAME</label>
              <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                disabled={!!editId}
                style={{
                  width: "100%", border: "1px solid #b0cce8", borderRadius: 4,
                  padding: "6px 10px", fontSize: 12, fontFamily: font, boxSizing: "border-box",
                  background: editId ? C.bgAlt : C.bg,
                }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 3 }}>
                PASSWORD {editId ? "(kosongkan jika tidak diganti)" : ""}
              </label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                style={{
                  width: "100%", border: "1px solid #b0cce8", borderRadius: 4,
                  padding: "6px 10px", fontSize: 12, fontFamily: font, boxSizing: "border-box",
                }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 3 }}>ROLE</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{
                  width: "100%", border: "1px solid #b0cce8", borderRadius: 4,
                  padding: "6px 10px", fontSize: 12, fontFamily: font, boxSizing: "border-box",
                }}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 3 }}>
              REG AUDITOR <span style={{ fontWeight: 400, color: C.faint }}>(REG RI AH XXXX — kosongkan jika bukan auditor)</span>
            </label>
            <input value={form.reg} onChange={e => setForm(p => ({ ...p, reg: e.target.value }))}
              placeholder="REG RI AH XXXX"
              disabled={form.role !== "auditor"}
              style={{
                width: "100%", border: "1px solid #b0cce8", borderRadius: 4,
                padding: "6px 10px", fontSize: 12, fontFamily: font, boxSizing: "border-box",
                opacity: form.role !== "auditor" ? 0.5 : 1,
              }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={editId ? handleEdit : handleAdd} style={{
              background: C.blue, color: "#fff", border: "none", borderRadius: 4,
              padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: font, cursor: "pointer",
            }}>{editId ? "Simpan Perubahan" : "Tambah User"}</button>
            <button onClick={resetForm} style={{
              background: "transparent", color: C.muted, border: `1px solid ${C.border}`,
              borderRadius: 4, padding: "6px 14px", fontSize: 12, fontWeight: 600,
              fontFamily: font, cursor: "pointer",
            }}>Batal</button>
          </div>
        </div>
      )}

      {/* User table */}
      <div style={{ border: `1px solid ${C.borderLight}`, borderRadius: 6, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.blue }}>
              <th style={{ padding: "8px 12px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>NAMA</th>
              <th style={{ padding: "8px 12px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>USERNAME</th>
              <th style={{ padding: "8px 12px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>ROLE</th>
              <th style={{ padding: "8px 12px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>REG AUDITOR</th>
              <th style={{ padding: "8px 12px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: "8px 12px", textAlign: "center", color: "#fff", fontSize: 11, fontWeight: 600 }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ background: i % 2 === 0 ? C.bg : C.bgAlt }}>
                <td style={{ padding: "8px 12px", fontWeight: 500, borderBottom: `1px solid ${C.borderLight}` }}>
                  {u.nama}
                </td>
                <td style={{ padding: "8px 12px", fontFamily: mono, fontSize: 11, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>
                  {u.username}
                </td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <span style={{
                    background: u.role === "admin" ? C.blueLight : u.role === "auditor" ? C.goldLight : C.bgAlt,
                    color: u.role === "admin" ? C.blue : u.role === "auditor" ? C.gold : C.muted,
                    padding: "2px 7px", borderRadius: 3, fontSize: 10, fontWeight: 600,
                  }}>
                    {ROLE_OPTIONS.find(r => r.value === u.role)?.label || u.role}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", fontFamily: mono, fontSize: 11, color: C.muted, borderBottom: `1px solid ${C.borderLight}` }}>
                  {u.role === "auditor" ? (u.reg || "—") : "—"}
                </td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <span style={{
                    background: u.status === "active" ? C.greenLight : C.redLight,
                    color: u.status === "active" ? C.green : C.red,
                    padding: "2px 7px", borderRadius: 3, fontSize: 10, fontWeight: 600,
                  }}>
                    {u.status === "active" ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button onClick={() => openEdit(u)}
                      style={{
                        background: "none", border: "1px solid #d0d0d0", borderRadius: 3,
                        padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: font,
                      }}>✏ Edit</button>
                    {u.id !== user?.id && (
                      <>
                        <button onClick={async () => {
                          await updateUser(u.id, { status: u.status === "active" ? "inactive" : "active" });
                          loadUsers();
                        }}
                          style={{
                            background: "none", border: "1px solid #d0d0d0", borderRadius: 3,
                            padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: font,
                          }}>
                          {u.status === "active" ? "🔒 Nonaktifkan" : "✅ Aktifkan"}
                        </button>
                        <button onClick={() => handleDelete(u.id)}
                          style={{
                            background: "none", border: "1px solid #d0d0d0", borderRadius: 3,
                            padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: font,
                            color: C.red,
                          }}>🗑 Hapus</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.faint }}>
                  Belum ada user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
    </div>
  );
}
