import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth import hash_password, get_current_user
from app.database import get_db
from app.models import UserCreate, UserUpdate, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@router.get("")
def list_users(
    db: sqlite3.Connection = Depends(get_db), _=Depends(require_admin),
):
    rows = db.execute(
        "SELECT id, username, nama, role, reg, status, created_at FROM users ORDER BY created_at"
    ).fetchall()
    return [dict(r) for r in rows]


@router.post("")
def create_user(
    body: UserCreate,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(require_admin),
):
    uid = f"user_{body.username}"
    hashed = hash_password(body.password)
    try:
        db.execute(
            "INSERT INTO users (id, username, password_hash, nama, role, reg) VALUES (?, ?, ?, ?, ?, ?)",
            (uid, body.username, hashed, body.nama, body.role, body.reg),
        )
        if body.role == "auditor":
            db.execute(
                "INSERT INTO auditors (nama, reg, jk, user_id) VALUES (?, ?, 'Laki-laki', ?)",
                (body.nama, body.reg, uid),
            )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Username already exists")
    return {"ok": True, "id": uid}


@router.put("/{user_id}")
def update_user(
    user_id: str,
    body: UserUpdate,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(require_admin),
):
    fields = []
    values = []
    if body.nama is not None:
        fields.append("nama = ?")
        values.append(body.nama)
    if body.role is not None:
        fields.append("role = ?")
        values.append(body.role)
    if body.status is not None:
        fields.append("status = ?")
        values.append(body.status)
    if body.reg is not None:
        fields.append("reg = ?")
        values.append(body.reg)
    if body.password is not None:
        fields.append("password_hash = ?")
        values.append(hash_password(body.password))
    if not fields:
        return {"ok": True}
    fields.append("updated_at = datetime('now')")
    values.append(user_id)
    db.execute(
        f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values
    )
    # Sync auditors table if this user is an auditor and nama/reg changed
    body_nama_changed = body.nama is not None
    body_reg_changed = body.reg is not None
    if body_nama_changed or body_reg_changed:
        row = db.execute(
            "SELECT role, nama, reg FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if row and row["role"] == "auditor":
            aud_nama = body.nama if body_nama_changed else row["nama"]
            aud_reg = body.reg if body_reg_changed else row["reg"]
            db.execute(
                "UPDATE auditors SET nama = ?, reg = ? WHERE user_id = ?",
                (aud_nama, aud_reg, user_id),
            )
            db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(require_admin),
):
    # Delete linked auditor record first (if any)
    db.execute("DELETE FROM auditors WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    db.commit()
    return {"ok": True}
