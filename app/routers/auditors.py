import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import get_db
from app.models import AuditorCreate, AuditorUpdate

router = APIRouter(prefix="/api/auditors", tags=["auditors"])


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@router.get("")
def list_auditors(
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = db.execute("SELECT id, nama, reg, jk FROM auditors ORDER BY id").fetchall()
    return [dict(r) for r in rows]


@router.post("")
def create_auditor(
    body: AuditorCreate,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(require_admin),
):
    cursor = db.execute(
        "INSERT INTO auditors (nama, reg, jk) VALUES (?, ?, ?)",
        (body.nama, body.reg, body.jk),
    )
    db.commit()
    return {"ok": True, "id": cursor.lastrowid}


@router.put("/{auditor_id}")
def update_auditor(
    auditor_id: int,
    body: AuditorUpdate,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(require_admin),
):
    fields = []
    values = []
    if body.nama is not None:
        fields.append("nama = ?")
        values.append(body.nama)
    if body.reg is not None:
        fields.append("reg = ?")
        values.append(body.reg)
    if body.jk is not None:
        fields.append("jk = ?")
        values.append(body.jk)
    if not fields:
        return {"ok": True}
    values.append(auditor_id)
    db.execute(
        f"UPDATE auditors SET {', '.join(fields)} WHERE id = ?", values
    )
    db.commit()
    return {"ok": True}


@router.delete("/{auditor_id}")
def delete_auditor(
    auditor_id: int,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(require_admin),
):
    db.execute("DELETE FROM auditors WHERE id = ?", (auditor_id,))
    db.commit()
    return {"ok": True}
