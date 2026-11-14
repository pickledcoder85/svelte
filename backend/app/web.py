"""Serve the built Expo web app from the same origin as the API.

One origin means one HTTPS certificate, no CORS, and relative `/api` URLs. The app shell is
not sensitive and is served without a session; every `/api` route keeps its own auth.
"""

import re
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response

# Files the browser must re-check on every load so a new deploy reaches the phone.
NO_CACHE_FILES = frozenset({"index.html", "sw.js", "manifest.json", "manifest.webmanifest", "metadata.json"})
# Content-hashed build output never changes under the same name.
# zxing/<version>/ holds the barcode-reader WASM; a new version gets a new folder.
IMMUTABLE_PREFIXES = ("_expo/static/", "zxing/")
HASHED_NAME = re.compile(r"[.-][0-9a-f]{16,}\.[A-Za-z0-9]+$")

NO_CACHE = "no-cache"
IMMUTABLE = "public, max-age=31536000, immutable"
SHORT_CACHE = "public, max-age=3600"


def cache_control_for(relative_path: str) -> str:
    name = relative_path.rsplit("/", 1)[-1]
    if name in NO_CACHE_FILES:
        return NO_CACHE
    if relative_path.startswith(IMMUTABLE_PREFIXES) or HASHED_NAME.search(name):
        return IMMUTABLE
    return SHORT_CACHE


def validate_web_dist(dist_dir: str) -> Path:
    root = Path(dist_dir).resolve()
    if not (root / "index.html").is_file():
        raise RuntimeError(
            f"WEB_DIST_DIR={dist_dir} has no index.html. Build it with `npm run build:web` "
            "in frontend/ or unset WEB_DIST_DIR."
        )
    return root


def mount_web_app(app: FastAPI, dist_dir: str) -> None:
    """Register the catch-all web route. Call after every API router is included."""
    root = validate_web_dist(dist_dir)
    index_file = root / "index.html"

    def file_response(path: Path) -> FileResponse:
        relative = path.relative_to(root).as_posix()
        return FileResponse(path, headers={"Cache-Control": cache_control_for(relative)})

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_web_app(full_path: str, request: Request) -> Response:
        if full_path == "api" or full_path.startswith("api/"):
            # Unknown API paths must stay JSON 404s, never the HTML app shell.
            raise HTTPException(status_code=404, detail="Not found.")
        if full_path:
            candidate = (root / full_path).resolve()
            if not candidate.is_relative_to(root):
                raise HTTPException(status_code=404, detail="Not found.")
            if candidate.is_file():
                return file_response(candidate)
            if "." in full_path.rsplit("/", 1)[-1]:
                # A missing asset (it has a file extension) is a real 404, not the app.
                raise HTTPException(status_code=404, detail="Not found.")
        return file_response(index_file)
