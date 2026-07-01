import os
import sqlite3
import urllib.error
import urllib.request
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

from app.config import DIST_DIR, DATABASE_PATH
from app.database import init_db
from app.routers import auth, auditors, photos, registrations, reports, state, stats, users
from app.services.seed import seed_database

BPJPH_TARGET = "https://prod-api-si.halal.go.id"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    db = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(lifespan=lifespan, docs_url="/api/docs")

# CORS for development (Vite on different port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(auditors.router)
app.include_router(registrations.router)
app.include_router(reports.router)
app.include_router(photos.router)
app.include_router(state.router)
app.include_router(stats.router)


# BPJPH proxy — same behavior as old server.py
@app.api_route(
    "/bpjph-api/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)
async def bpjph_proxy(path: str, request: Request):
    target = f"{BPJPH_TARGET}/{path}"
    qs = request.url.query
    if qs:
        target += f"?{qs}"
    body = await request.body() if request.method in ("POST", "PUT") else None
    req = urllib.request.Request(
        target, data=body, method=request.method,
        headers={"Authorization": request.headers.get("Authorization", "")},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return Response(
                content=resp.read(),
                status_code=resp.status,
                media_type=resp.headers.get("Content-Type", "application/json"),
            )
    except urllib.error.HTTPError as e:
        return Response(content=e.read(), status_code=e.code, media_type="application/json")
    except urllib.error.URLError:
        return Response(content='{"error":"BPJPH API unreachable"}', status_code=502)


# Serve static files from dist/ for all other routes
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join(DIST_DIR, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return Response("Not Found", status_code=404)
