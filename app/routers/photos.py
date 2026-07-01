import json
import os
import sqlite3
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.auth import get_current_user
from app.config import ALLOWED_PHOTO_TYPES, MAX_PHOTO_SIZE, PHOTOS_DIR
from app.database import get_db
from app.models import PhotoMetadataUpdate

router = APIRouter(prefix="/api/photos", tags=["photos"])


@router.post("/{reg_id}/{category}")
async def upload_photo(
    reg_id: str,
    category: str,
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    if category not in ("label", "fasilitas"):
        raise HTTPException(400, "category must be 'label' or 'fasilitas'")
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    contents = await file.read()
    if len(contents) > MAX_PHOTO_SIZE:
        raise HTTPException(400, "File too large (max 10 MB)")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    category_dir = os.path.join(PHOTOS_DIR, category)
    os.makedirs(category_dir, exist_ok=True)
    with open(os.path.join(category_dir, filename), "wb") as f:
        f.write(contents)
    cursor = db.execute(
        "INSERT INTO photos (reg_id, category, filename, original_name, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?)",
        (reg_id, category, filename, file.filename, file.content_type, len(contents)),
    )
    db.commit()
    return {
        "id": cursor.lastrowid,
        "filename": filename,
        "url": f"/api/photos/{cursor.lastrowid}/file",
    }


@router.get("/{reg_id}/{category}")
def list_photos(
    reg_id: str,
    category: str,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    if category not in ("label", "fasilitas"):
        raise HTTPException(400, "category must be 'label' or 'fasilitas'")
    rows = db.execute(
        "SELECT * FROM photos WHERE reg_id = ? AND category = ? ORDER BY created_at DESC",
        (reg_id, category),
    ).fetchall()
    result = []
    for r in rows:
        result.append(
            {
                "id": r["id"],
                "reg_id": r["reg_id"],
                "category": r["category"],
                "filename": r["filename"],
                "original_name": r["original_name"],
                "mime_type": r["mime_type"],
                "file_size": r["file_size"],
                "metadata_json": json.loads(r["metadata_json"]) if r["metadata_json"] else {},
                "created_at": r["created_at"],
                "url": f"/api/photos/{r['id']}/file",
            }
        )
    return result


@router.get("/{photo_id}/file")
def get_photo_file(
    photo_id: int,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    row = db.execute("SELECT * FROM photos WHERE id = ?", (photo_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Photo not found")
    path = os.path.join(PHOTOS_DIR, row["category"], row["filename"])
    if not os.path.exists(path):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(path, media_type=row["mime_type"])


@router.put("/{photo_id}/metadata")
def update_photo_metadata(
    photo_id: int,
    body: PhotoMetadataUpdate,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    db.execute(
        "UPDATE photos SET metadata_json = ? WHERE id = ?",
        (json.dumps(body.metadata_json), photo_id),
    )
    db.commit()
    return {"ok": True}


@router.delete("/{photo_id}")
def delete_photo(
    photo_id: int,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(get_current_user),
):
    row = db.execute("SELECT * FROM photos WHERE id = ?", (photo_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Photo not found")
    path = os.path.join(PHOTOS_DIR, row["category"], row["filename"])
    if os.path.exists(path):
        os.remove(path)
    db.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
    db.commit()
    return {"ok": True}
