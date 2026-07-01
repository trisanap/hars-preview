import hashlib
import hmac
import base64
import os
import sqlite3
from datetime import datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_secret_key
from app.database import get_db

SECRET = get_secret_key()
ALGORITHM = "HS256"
security = HTTPBearer()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return base64.b64encode(salt + key).decode()


def verify_password(password: str, stored: str) -> bool:
    try:
        raw = base64.b64decode(stored)
        salt, key = raw[:16], raw[16:]
        expected = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return hmac.compare_digest(expected, key)
    except Exception:
        return False


def create_access_token(
    data: dict, expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=12))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401)
    row = db.execute(
        "SELECT id, username, nama, role, reg, status, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    if not row or row["status"] != "active":
        raise HTTPException(status_code=401, detail="User inactive or not found")
    return dict(row)
