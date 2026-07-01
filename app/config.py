import os
import secrets

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")
DIST_DIR = os.path.join(ROOT_DIR, "dist")
SECRET_KEY_FILE = os.path.join(DATA_DIR, "secret.key")
DATABASE_PATH = os.path.join(DATA_DIR, "hars.db")
PHOTOS_DIR = os.path.join(DATA_DIR, "photos")

MAX_PHOTO_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}


def get_secret_key() -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(SECRET_KEY_FILE):
        with open(SECRET_KEY_FILE) as f:
            return f.read().strip()
    key = secrets.token_hex(32)
    with open(SECRET_KEY_FILE, "w") as f:
        f.write(key)
    return key
