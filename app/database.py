import os
import sqlite3

from app.config import DATABASE_PATH

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS auditors (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nama       TEXT NOT NULL,
    reg        TEXT DEFAULT '',
    jk         TEXT NOT NULL CHECK(jk IN ('Laki-laki','Perempuan')),
    user_id    TEXT UNIQUE REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nama          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK(role IN ('admin','auditor','observer')),
    reg           TEXT DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS registrations (
    id                    TEXT PRIMARY KEY,
    nama_pu               TEXT NOT NULL,
    nama_usaha            TEXT DEFAULT '',
    jenis_produk          TEXT NOT NULL,
    tanggal_daftar        TEXT DEFAULT '',
    tanggal_audit         TEXT DEFAULT '',
    lead_auditor          INTEGER,
    auditor               INTEGER,
    auditor2              INTEGER,
    auditor3              INTEGER,
    observer              TEXT DEFAULT '',
    alamat                TEXT DEFAULT '',
    agama_pemilik         TEXT DEFAULT 'Islam',
    jenis_pendaftaran     TEXT DEFAULT 'Pengajuan Baru',
    nama_pabrik           TEXT DEFAULT '',
    alamat_pabrik         TEXT DEFAULT '',
    fasilitas_kota        TEXT DEFAULT '',
    fasilitas_negara      TEXT DEFAULT 'Indonesia',
    penyelia_halal        TEXT DEFAULT '',
    penyelia_no_ktp       TEXT DEFAULT '',
    penyelia_no_sertifikat TEXT DEFAULT '',
    penyelia_no_sk        TEXT DEFAULT '',
    penyelia_no_kontak    TEXT DEFAULT '',
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (lead_auditor) REFERENCES auditors(id),
    FOREIGN KEY (auditor) REFERENCES auditors(id),
    FOREIGN KEY (auditor2) REFERENCES auditors(id),
    FOREIGN KEY (auditor3) REFERENCES auditors(id)
);

CREATE TABLE IF NOT EXISTS reports (
    id              TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL UNIQUE,
    lulus           INTEGER NOT NULL DEFAULT 1,
    verdict         TEXT NOT NULL DEFAULT 'lulus'
                       CHECK(verdict IN ('lulus','tidak_lulus','menunggu_perbaikan')),
    status          TEXT NOT NULL DEFAULT 'draft'
                       CHECK(status IN ('draft','final','archived')),
    data_json       TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photos (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_id             TEXT NOT NULL,
    category           TEXT NOT NULL CHECK(category IN ('label','fasilitas')),
    filename           TEXT NOT NULL,
    original_name      TEXT NOT NULL DEFAULT '',
    mime_type          TEXT NOT NULL DEFAULT 'image/jpeg',
    file_size          INTEGER NOT NULL DEFAULT 0,
    metadata_json      TEXT NOT NULL DEFAULT '{}',
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (reg_id) REFERENCES registrations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_state (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def init_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    db = sqlite3.connect(DATABASE_PATH)
    db.executescript(SCHEMA_SQL)
    # Add user_id column to auditors table for user↔auditor sync
    try:
        db.execute("ALTER TABLE auditors ADD COLUMN user_id TEXT UNIQUE REFERENCES users(id)")
    except sqlite3.OperationalError:
        pass  # column already exists
    # Remove seeded auditors that aren't linked to any user account
    db.execute("UPDATE registrations SET lead_auditor = NULL WHERE lead_auditor IN (SELECT id FROM auditors WHERE user_id IS NULL)")
    db.execute("UPDATE registrations SET auditor = NULL WHERE auditor IN (SELECT id FROM auditors WHERE user_id IS NULL)")
    db.execute("UPDATE registrations SET auditor2 = NULL WHERE auditor2 IN (SELECT id FROM auditors WHERE user_id IS NULL)")
    db.execute("UPDATE registrations SET auditor3 = NULL WHERE auditor3 IN (SELECT id FROM auditors WHERE user_id IS NULL)")
    db.execute("DELETE FROM auditors WHERE user_id IS NULL")
    db.commit()
    db.close()


def get_db():
    """FastAPI dependency that yields a DB connection."""
    db = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
    finally:
        db.close()
