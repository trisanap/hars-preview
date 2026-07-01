// ─── IndexedDB Storage Layer ────────────────────────────────────────────────
// Stores: users, registrations, auditors, app_state, reports

const DB_NAME = "hars_db";
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("users")) {
        const users = db.createObjectStore("users", { keyPath: "id" });
        users.createIndex("username", "username", { unique: true });
      }
      if (!db.objectStoreNames.contains("registrations")) {
        db.createObjectStore("registrations", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("auditors")) {
        db.createObjectStore("auditors", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("app_state")) {
        db.createObjectStore("app_state", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("reports")) {
        db.createObjectStore("reports", { keyPath: "id" });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => { resolve(req.result); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

async function get(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => { resolve(req.result || null); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

async function put(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => { resolve(req.result); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

async function del(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => { resolve(); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

async function getByIndex(store, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const idx = tx.objectStore(store).index(indexName);
    const req = idx.get(value);
    req.onsuccess = () => { resolve(req.result || null); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

async function clear(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => { resolve(); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

// ─── App State helpers (key-value) ───────────────────────────────────────────
async function getState(key, fallback = null) {
  const val = await get("app_state", key);
  return val ? val.value : fallback;
}

async function setState(key, value) {
  await put("app_state", { key, value });
}

// ─── Seed default data ──────────────────────────────────────────────────────
async function isSeeded() {
  return getState("db_seeded", false);
}

async function seedAuditors() {
  const existing = await getAll("auditors");
  if (existing.length > 0) return;

  const defaultAuditors = [
    { id: 1, nama: "Nahla Qurrotu'ain, S.Si.", reg: "", jk: "Perempuan" },
    { id: 2, nama: "Dr. Sandra Hermanto, M.Si.", reg: "", jk: "Perempuan" },
    { id: 3, nama: "Etyn Yunita, M.Si.", reg: "", jk: "Perempuan" },
    { id: 4, nama: "Dr. Yusraini Dian Inayati Siregar, M.Si.", reg: "REG RI AH 200054823", jk: "Perempuan" },
    { id: 5, nama: "Dr. Adi Riyadhi, M.Si.", reg: "REG RI AH 100054723", jk: "Laki-laki" },
    { id: 6, nama: "Dr. La Ode Sumarlin, M.Si.", reg: "", jk: "Laki-laki" },
    { id: 7, nama: "Dina Rizky Triani, S.Si.", reg: "REG RI AH 200192525", jk: "Perempuan" },
    { id: 8, nama: "Trisan Andrean Putra, S.Si.", reg: "REG RI AH 100196725", jk: "Laki-laki" },
    { id: 9, nama: "Dr. drh. Raden Rara Bhintarti Suryohastari, M.Biomed", reg: "", jk: "Perempuan" },
    { id: 10, nama: "apt. Mabrurotul Mustafidah, M.Pharm.Sci.", reg: "", jk: "Perempuan" },
    { id: 11, nama: "Dr. Narti Fitriana, M.Si.", reg: "", jk: "Perempuan" },
  ];

  for (const a of defaultAuditors) {
    await put("auditors", a);
  }
}

async function seedDefaultRegistrations() {
  const existing = await getAll("registrations");
  if (existing.length > 0) return;

  const defaults = [
    {
      id: "SH2026-1-1860101",
      namaPU: "Bakemood Bakehouse (Gita Meirinda)",
      namaUsaha: "Bakemood Bakehouse",
      jenisProduk: "Produk Bakeri",
      tanggalDaftar: "2026-01-18",
      tanggalAudit: "2026-04-16",
      leadAuditor: 4,
      auditor: 8,
      observer: "Dr. Narti Fitriana, M.Si.",
      alamat: "Komplek Harperindo Jalan Harapan Permai 1 Blok A2 no. 1B, Cempaka Putih, Ciputat Timur, Tangerang Selatan, Banten",
      agamaPemilik: "Islam",
      jenisPendaftaran: "Pengajuan Baru",
      namaPabrik: "Bakemood Bakehouse",
      alamatPabrik: "Komplek Harperindo Jalan Harapan Permai 1 Blok A2 no. 1B",
      fasilitasKota: "Tangerang Selatan",
      fasilitasNegara: "Indonesia",
      penyeliaHalal: "Gita Meirinda",
      penyeliaNoKTP: "",
      penyeliaNoSertifikat: "",
      penyeliaNoSK: "",
      penyeliaNoKontak: "",
    },
  ];

  for (const r of defaults) {
    await put("registrations", r);
  }
}

async function seedDefaultAdmin() {
  const existing = await getByIndex("users", "username", "admin");
  if (existing) return;

  const defaultUsers = [
    {
      id: "user_admin",
      username: "admin",
      password: simpleHash("admin123"),
      nama: "Administrator LPH",
      role: "admin",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_nahla",
      username: "nahla",
      password: await hashPassword("audit123"),
      nama: "Nahla Qurrotu'ain, S.Si.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_sandra",
      username: "sandra",
      password: await hashPassword("audit123"),
      nama: "Dr. Sandra Hermanto, M.Si.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_etyen",
      username: "etyen",
      password: await hashPassword("audit123"),
      nama: "Etyn Yunita, M.Si.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_yusraini",
      username: "yusraini",
      password: await hashPassword("audit123"),
      nama: "Dr. Yusraini Dian Inayati Siregar, M.Si.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_adi",
      username: "adi",
      password: await hashPassword("audit123"),
      nama: "Dr. Adi Riyadhi, M.Si.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_laode",
      username: "laode",
      password: await hashPassword("audit123"),
      nama: "Dr. La Ode Sumarlin, M.Si.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_dina",
      username: "dina",
      password: await hashPassword("audit123"),
      nama: "Dina Rizky Triani, S.Si.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_trisan",
      username: "trisan",
      password: await hashPassword("audit123"),
      nama: "Trisan Andrean Putra, S.Si.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_bhintarti",
      username: "bhintarti",
      password: await hashPassword("audit123"),
      nama: "Dr. drh. Raden Rara Bhintarti Suryohastari, M.Biomed",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user_mabrurotul",
      username: "mabrurotul",
      password: await hashPassword("audit123"),
      nama: "apt. Mabrurotul Mustafidah, M.Pharm.Sci.",
      role: "auditor",
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ];

  for (const u of defaultUsers) {
    await put("users", u);
  }
}

// ─── Password hashing (pure JS, works on HTTP too) ──────────────────────────
// Uses a simple but deterministic hash — adequate for this local tool.
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

async function hashPassword(password) {
  return simpleHash(password);
}

async function verifyPassword(password, hash) {
  // Try current hashing method
  if (simpleHash(password) === hash) return true;
  // Backward compat: stored hash might be SHA-256 (seeded under HTTPS/localhost)
  try {
    if (typeof crypto !== "undefined" && crypto.subtle && /^[0-9a-f]{64}$/i.test(hash)) {
      const enc = new TextEncoder().encode(password);
      const buf = await crypto.subtle.digest("SHA-256", enc);
      const sha256 = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (sha256 === hash) return true;
    }
  } catch (_) {}
  return false;
}

// ─── Initialize database with seed data ──────────────────────────────────────
async function initDB() {
  const seeded = await isSeeded();
  if (!seeded) {
    await seedAuditors();
    await seedDefaultRegistrations();
    await seedDefaultAdmin();
    await setState("db_seeded", true);
  } else {
    // Migrate existing user hashes from SHA-256 → simple hash (for HTTP access)
    await migratePasswordHashes();
  }
}

async function migratePasswordHashes() {
  const db = await openDB();
  const tx = db.transaction("users", "readwrite");
  const store = tx.objectStore("users");
  const all = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
  let changed = false;
  for (const user of all) {
    if (user.password && /^[0-9a-f]{64}$/i.test(user.password)) {
      // Re-hash known passwords
      const known = { admin: "admin123", nahla: "audit123", sandra: "audit123", etyen: "audit123",
        yusraini: "audit123", adi: "audit123", laode: "audit123", dina: "audit123",
        trisan: "audit123", bhintarti: "audit123", mabrurotul: "audit123" };
      const pw = known[user.username];
      if (pw) {
        user.password = simpleHash(pw);
        store.put(user);
        changed = true;
      }
    }
  }
  if (changed) {
    await new Promise(resolve => { tx.oncomplete = resolve; });
  }
  db.close();
}

export {
  openDB,
  getAll,
  get,
  put,
  del,
  getByIndex,
  clear,
  getState,
  setState,
  hashPassword,
  verifyPassword,
  initDB,
};
