import sqlite3
import gzip
import json
import os
import hashlib
import base64

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SEED_FILE = os.path.join(ROOT_DIR, "seed-data", "demo-data.json.gz")

AUDITORS = [
    (13, "Trisan Andrean Putra, S.Si.", "REG RI AH 100196725", "Laki-laki"),
]

USERS = [
    ("user_admin", "admin", "demo123", "Administrator LPH", "admin"),
    ("user_trisan", "trisan", "demo123", "Trisan Andrean Putra, S.Si.", "auditor"),
]

REGISTRATIONS = []


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return base64.b64encode(salt + key).decode()


def seed_database(db: sqlite3.Connection):
    """Idempotent seed — only runs if users table is empty."""
    count = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count > 0:
        return

    # Seed auditors
    for aud in AUDITORS:
        db.execute(
            "INSERT INTO auditors (id, nama, reg, jk) VALUES (?, ?, ?, ?)",
            aud,
        )

    # Seed users
    for uid, username, pw, nama, role in USERS:
        hashed = _hash_password(pw)
        db.execute(
            "INSERT INTO users (id, username, password_hash, nama, role) VALUES (?, ?, ?, ?, ?)",
            (uid, username, hashed, nama, role),
        )

    # Seed registrations
    for reg in REGISTRATIONS:
        db.execute(
            """INSERT INTO registrations (
                id, nama_pu, nama_usaha, jenis_produk,
                tanggal_daftar, tanggal_audit,
                lead_auditor, auditor, auditor2, auditor3,
                observer, alamat, agama_pemilik, jenis_pendaftaran,
                nama_pabrik, alamat_pabrik, fasilitas_kota, fasilitas_negara,
                penyelia_halal, penyelia_no_ktp, penyelia_no_sertifikat,
                penyelia_no_sk, penyelia_no_kontak
            ) VALUES (
                :id, :nama_pu, :nama_usaha, :jenis_produk,
                :tanggal_daftar, :tanggal_audit,
                :lead_auditor, :auditor, :auditor2, :auditor3,
                :observer, :alamat, :agama_pemilik, :jenis_pendaftaran,
                :nama_pabrik, :alamat_pabrik, :fasilitas_kota, :fasilitas_negara,
                :penyelia_halal, :penyelia_no_ktp, :penyelia_no_sertifikat,
                :penyelia_no_sk, :penyelia_no_kontak
            )""",
            reg,
        )

    db.commit()


def load_demo_data(db: sqlite3.Connection):
    """Load AKRICH demo data if not already present."""
    row = db.execute(
        "SELECT COUNT(*) FROM registrations WHERE id = 'SH2026-1-2233551'"
    ).fetchone()
    if row[0] > 0:
        return

    if not os.path.exists(SEED_FILE):
        return

    with gzip.open(SEED_FILE, "rt", encoding="utf-8") as f:
        data = json.load(f)

    # Auditors first (FK target)
    for a in data.get("auditors", []):
        exists = db.execute("SELECT 1 FROM auditors WHERE id = ?", (a["id"],)).fetchone()
        if not exists:
            db.execute(
                "INSERT INTO auditors (id, nama, reg, jk) VALUES (:id, :nama, :reg, :jk)",
                a,
            )

    # Registration
    for r in data.get("registrations", []):
        db.execute(
            """INSERT INTO registrations (
                id, nama_pu, nama_usaha, jenis_produk,
                tanggal_daftar, tanggal_audit,
                lead_auditor, auditor, auditor2, auditor3,
                observer, alamat, agama_pemilik, jenis_pendaftaran,
                nama_pabrik, alamat_pabrik, fasilitas_kota, fasilitas_negara,
                penyelia_halal, penyelia_no_ktp, penyelia_no_sertifikat,
                penyelia_no_sk, penyelia_no_kontak
            ) VALUES (
                :id, :nama_pu, :nama_usaha, :jenis_produk,
                :tanggal_daftar, :tanggal_audit,
                :lead_auditor, :auditor, :auditor2, :auditor3,
                :observer, :alamat, :agama_pemilik, :jenis_pendaftaran,
                :nama_pabrik, :alamat_pabrik, :fasilitas_kota, :fasilitas_negara,
                :penyelia_halal, :penyelia_no_ktp, :penyelia_no_sertifikat,
                :penyelia_no_sk, :penyelia_no_kontak
            )""",
            r,
        )

    # Report
    for r in data.get("reports", []):
        db.execute(
            """INSERT INTO reports (
                id, registration_id, lulus, verdict, status, data_json
            ) VALUES (
                :id, :registration_id, :lulus, :verdict, :status, :data_json
            )""",
            r,
        )

    # App state
    for s in data.get("app_state", []):
        db.execute(
            "INSERT INTO app_state (key, value) VALUES (:key, :value)",
            s,
        )

    db.commit()
