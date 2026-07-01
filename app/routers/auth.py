import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.database import get_db
from app.models import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute(
        "SELECT * FROM users WHERE username = ?", (body.username,)
    ).fetchone()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    if row["status"] != "active":
        raise HTTPException(status_code=401, detail="Akun tidak aktif")
    token = create_access_token({"sub": row["id"], "role": row["role"]})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(
            id=row["id"],
            username=row["username"],
            nama=row["nama"],
            reg=row["reg"] or "",
            role=row["role"],
            status=row["status"],
            created_at=row["created_at"],
        ),
    )


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)
