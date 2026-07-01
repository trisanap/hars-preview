import json
import sqlite3

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_db
from app.models import ReportSave

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{reg_id}")
def get_report(
    reg_id: str,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    row = db.execute(
        "SELECT * FROM reports WHERE registration_id = ?", (reg_id,)
    ).fetchone()
    if not row:
        return {
            "id": reg_id,
            "registration_id": reg_id,
            "lulus": True,
            "verdict": "lulus",
            "status": "draft",
            "data_json": {},
            "created_at": "",
            "updated_at": "",
        }
    return {
        "id": row["id"],
        "registration_id": row["registration_id"],
        "lulus": bool(row["lulus"]),
        "verdict": row["verdict"] if "verdict" in row.keys() else ("lulus" if bool(row["lulus"]) else "tidak_lulus"),
        "status": row["status"],
        "data_json": json.loads(row["data_json"]) if row["data_json"] else {},
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@router.put("/{reg_id}")
def save_report(
    reg_id: str,
    body: ReportSave,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    db.execute(
        """INSERT INTO reports (id, registration_id, lulus, verdict, status, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(registration_id) DO UPDATE SET
            lulus = excluded.lulus,
            verdict = excluded.verdict,
            status = excluded.status,
            data_json = excluded.data_json,
            updated_at = datetime('now')""",
        (reg_id, reg_id, int(body.lulus), body.verdict, body.status, json.dumps(body.data_json)),
    )
    db.commit()
    return {"ok": True}
