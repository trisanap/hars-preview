#!/usr/bin/env python3
"""HARS production server — FastAPI + static file serving + BPJPH proxy.

Usage:
    python3 server.py            # port 5173
    python3 server.py 8080       # custom port
"""
import sys
import uvicorn

from app.main import app

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 4561
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
