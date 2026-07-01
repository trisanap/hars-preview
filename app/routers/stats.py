import os
import sqlite3

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.config import DATA_DIR
from app.database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


def dir_size(path: str) -> int:
    total = 0
    if os.path.isdir(path):
        for fname in os.listdir(path):
            fpath = os.path.join(path, fname)
            if os.path.isfile(fpath):
                total += os.path.getsize(fpath)
    return total


@router.get("")
def get_stats(
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    reg_count = db.execute(
        "SELECT COUNT(*) FROM registrations"
    ).fetchone()[0]
    auditor_count = db.execute(
        "SELECT COUNT(*) FROM auditors"
    ).fetchone()[0]

    # Total disk usage of data/ directory
    disk_bytes = 0
    if os.path.isdir(DATA_DIR):
        for item in os.listdir(DATA_DIR):
            item_path = os.path.join(DATA_DIR, item)
            if os.path.isfile(item_path):
                disk_bytes += os.path.getsize(item_path)
            elif os.path.isdir(item_path):
                disk_bytes += dir_size(item_path)

    return {
        "registrations": reg_count,
        "auditors": auditor_count,
        "diskBytes": disk_bytes,
    }
