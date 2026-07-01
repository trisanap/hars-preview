import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import get_db
from app.models import RegistrationCreate, RegistrationUpdate

router = APIRouter(prefix="/api/registrations", tags=["registrations"])


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def get_auditor_id(user: dict, db: sqlite3.Connection) -> int | None:
    """Return the auditor.id linked to this user, or None if not found."""
    if user["role"] == "admin":
        return None  # admin sees all
    row = db.execute(
        "SELECT id FROM auditors WHERE user_id = ?", (user["id"],)
    ).fetchone()
    return row["id"] if row else None


def check_registration_access(reg_id: str, user: dict, db: sqlite3.Connection):
    """Raise 404 if the user can't access this registration."""
    if user["role"] == "admin":
        return
    auditor_id = get_auditor_id(user, db)
    if auditor_id is None:
        raise HTTPException(403, "No auditor profile linked to your account")
    reg = db.execute(
        """SELECT id FROM registrations WHERE id = ? AND (
            lead_auditor = ? OR auditor = ? OR auditor2 = ? OR auditor3 = ?)""",
        (reg_id, auditor_id, auditor_id, auditor_id, auditor_id),
    ).fetchone()
    if not reg:
        raise HTTPException(404, "Registration not found")


ROW_TO_COL = {
    "id": "id",
    "nama_pu": "nama_pu",
    "nama_usaha": "nama_usaha",
    "jenis_produk": "jenis_produk",
    "tanggal_daftar": "tanggal_daftar",
    "tanggal_audit": "tanggal_audit",
    "lead_auditor": "lead_auditor",
    "auditor": "auditor",
    "auditor2": "auditor2",
    "auditor3": "auditor3",
    "observer": "observer",
    "alamat": "alamat",
    "agama_pemilik": "agama_pemilik",
    "jenis_pendaftaran": "jenis_pendaftaran",
    "nama_pabrik": "nama_pabrik",
    "alamat_pabrik": "alamat_pabrik",
    "fasilitas_kota": "fasilitas_kota",
    "fasilitas_negara": "fasilitas_negara",
    "penyelia_halal": "penyelia_halal",
    "penyelia_no_ktp": "penyelia_no_ktp",
    "penyelia_no_sertifikat": "penyelia_no_sertifikat",
    "penyelia_no_sk": "penyelia_no_sk",
    "penyelia_no_kontak": "penyelia_no_kontak",
    "created_at": "created_at",
    "updated_at": "updated_at",
}


def row_to_dict(row: sqlite3.Row) -> dict:
    return {key: row[col] for key, col in ROW_TO_COL.items()}


@router.get("")
def list_registrations(
    db: sqlite3.Connection = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if user["role"] == "admin":
        rows = db.execute(
            "SELECT * FROM registrations ORDER BY created_at DESC"
        ).fetchall()
    else:
        auditor_id = get_auditor_id(user, db)
        if auditor_id is None:
            # Observer or auditor without a profile — return empty
            return []
        rows = db.execute(
            """SELECT * FROM registrations
               WHERE lead_auditor = ? OR auditor = ? OR auditor2 = ? OR auditor3 = ?
               ORDER BY created_at DESC""",
            (auditor_id, auditor_id, auditor_id, auditor_id),
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@router.get("/{reg_id}")
def get_registration(
    reg_id: str,
    db: sqlite3.Connection = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    check_registration_access(reg_id, user, db)
    row = db.execute(
        "SELECT * FROM registrations WHERE id = ?", (reg_id,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Registration not found")
    return row_to_dict(row)


@router.post("")
def create_registration(
    body: RegistrationCreate,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(require_admin),
):
    try:
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
            body.model_dump(),
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Registration ID already exists")
    return {"ok": True}


@router.put("/{reg_id}")
def update_registration(
    reg_id: str,
    body: RegistrationUpdate,
    db: sqlite3.Connection = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    check_registration_access(reg_id, user, db)
    fields = []
    values = []
    for field, col in ROW_TO_COL.items():
        val = getattr(body, field, None)
        if val is not None:
            fields.append(f"{col} = ?")
            values.append(val)
    if not fields:
        return {"ok": True}
    fields.append("updated_at = datetime('now')")
    values.append(reg_id)
    db.execute(
        f"UPDATE registrations SET {', '.join(fields)} WHERE id = ?",
        values,
    )
    db.commit()
    return {"ok": True}


@router.delete("/{reg_id}")
def delete_registration(
    reg_id: str,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(require_admin),
):
    db.execute("DELETE FROM registrations WHERE id = ?", (reg_id,))
    db.commit()
    return {"ok": True}
