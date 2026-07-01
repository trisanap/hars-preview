import sqlite3

from app.auth import hash_password

AUDITORS = [
    (1, "Auditor Satu, M.Si.", "", "Perempuan"),
    (2, "Auditor Dua, M.Si.", "", "Perempuan"),
    (3, "Auditor Tiga, M.Si.", "", "Perempuan"),
    (4, "Auditor Empat, M.Si.", "", "Perempuan"),
    (5, "Auditor Lima, M.Si.", "", "Laki-laki"),
    (6, "Auditor Enam, M.Si.", "", "Laki-laki"),
    (7, "Auditor Tujuh, M.Si.", "", "Perempuan"),
    (8, "Auditor Delapan, M.Si.", "", "Perempuan"),
    (9, "Auditor Sembilan, M.Si.", "", "Perempuan"),
    (10, "Auditor Sepuluh, M.Si.", "", "Perempuan"),
    (11, "Auditor Sebelas, M.Si.", "", "Perempuan"),
]

USERS = [
    ("user_admin", "admin", "demo123", "Administrator LPH", "admin"),
    ("user_auditor1", "auditor1", "demo123", "Auditor Satu, M.Si.", "auditor"),
    ("user_auditor2", "auditor2", "demo123", "Auditor Dua, M.Si.", "auditor"),
    ("user_auditor3", "auditor3", "demo123", "Auditor Tiga, M.Si.", "auditor"),
    ("user_auditor4", "auditor4", "demo123", "Auditor Empat, M.Si.", "auditor"),
    ("user_auditor5", "auditor5", "demo123", "Auditor Lima, M.Si.", "auditor"),
    ("user_auditor6", "auditor6", "demo123", "Auditor Enam, M.Si.", "auditor"),
    ("user_auditor7", "auditor7", "demo123", "Auditor Tujuh, M.Si.", "auditor"),
    ("user_auditor8", "auditor8", "demo123", "Auditor Delapan, M.Si.", "auditor"),
    ("user_auditor9", "auditor9", "demo123", "Auditor Sembilan, M.Si.", "auditor"),
    ("user_auditor10", "auditor10", "demo123", "Auditor Sepuluh, M.Si.", "auditor"),
]

REGISTRATIONS = []


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
        hashed = hash_password(pw)
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
