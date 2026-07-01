import json
import re
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import get_db
from app.models import StateSet

router = APIRouter(prefix="/api/state", tags=["state"])

# Keys scoped to a specific registration — access is checked per registration
_REG_SCOPED_PATTERNS = [
    re.compile(p) for p in [
        r"^fasilitas_(.+)$",
        r"^st_list_(.+)$",
        r"^st_meta_(.+?)(?:_\d+)?$",
        r"^tl_(.+)$",
        r"^spk_meta_(.+)$",
    ]
]


def _extract_reg_id(key: str) -> str | None:
    """If the key is registration-scoped, return the reg_id; otherwise None."""
    for pattern in _REG_SCOPED_PATTERNS:
        m = pattern.match(key)
        if m:
            return m.group(1)
    return None


def _check_reg_access(reg_id: str, user: dict, db: sqlite3.Connection):
    """Raise 404 if a non-admin user is not assigned to this registration."""
    if user["role"] == "admin":
        return
    auditor_row = db.execute(
        "SELECT id FROM auditors WHERE user_id = ?", (user["id"],)
    ).fetchone()
    if not auditor_row:
        raise HTTPException(403, "No auditor profile linked to your account")
    aid = auditor_row["id"]
    reg = db.execute(
        """SELECT id FROM registrations WHERE id = ? AND (
            lead_auditor = ? OR auditor = ? OR auditor2 = ? OR auditor3 = ?)""",
        (reg_id, aid, aid, aid, aid),
    ).fetchone()
    if not reg:
        raise HTTPException(404, "Registration not found")


@router.get("/{key}")
def get_state(
    key: str,
    db: sqlite3.Connection = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    reg_id = _extract_reg_id(key)
    if reg_id:
        _check_reg_access(reg_id, user, db)
    row = db.execute(
        "SELECT key, value FROM app_state WHERE key = ?", (key,)
    ).fetchone()
    if not row:
        return {"key": key, "value": None}
    return {"key": row["key"], "value": json.loads(row["value"])}


@router.put("/{key}")
def set_state(
    key: str,
    body: StateSet,
    db: sqlite3.Connection = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    reg_id = _extract_reg_id(key)
    if reg_id:
        _check_reg_access(reg_id, user, db)
    db.execute(
        """INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = datetime('now')""",
        (key, json.dumps(body.value)),
    )
    db.commit()
    return {"ok": True}
