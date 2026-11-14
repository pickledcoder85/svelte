from pathlib import Path

import httpx
import pytest

from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.web import cache_control_for

BUNDLE = "_expo/static/js/web/AppEntry-bffb4d8d53a765afc5e466a8b41c9b18.js"
IMAGE = "assets/assets/mascot.8e2f0c1d3b4a59687a6b5c4d3e2f1a0b.png"


def build_dist(root: Path) -> Path:
    files = {
        "index.html": "<!DOCTYPE html><title>Relish</title><div id=root></div>",
        "favicon.ico": "ico",
        "sw.js": "self.addEventListener('fetch', () => {});",
        BUNDLE: "console.log('app');",
        IMAGE: "png",
    }
    for relative, content in files.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    return root


def web_client(tmp_path: Path) -> httpx.AsyncClient:
    dist = build_dist(tmp_path / "dist")
    app = create_app(
        database_path=str(tmp_path / "web.db"),
        settings=Settings(_env_file=None, app_env="test", web_dist_dir=str(dist)),
    )
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")


@pytest.mark.parametrize(
    "path, expected",
    [
        ("index.html", "no-cache"),
        ("sw.js", "no-cache"),
        ("manifest.json", "no-cache"),
        (BUNDLE, "public, max-age=31536000, immutable"),
        (IMAGE, "public, max-age=31536000, immutable"),
        ("favicon.ico", "public, max-age=3600"),
    ],
)
def test_cache_policy(path, expected):
    assert cache_control_for(path) == expected


@pytest.mark.asyncio
async def test_serves_the_app_shell_and_deep_links(tmp_path):
    async with web_client(tmp_path) as client:
        for path in ("/", "/tracker", "/meal-plan/2026-04-01"):
            response = await client.get(path)
            assert response.status_code == 200, path
            assert "<div id=root>" in response.text
            assert response.headers["cache-control"] == "no-cache"
        assert (await client.head("/")).status_code == 200


@pytest.mark.asyncio
async def test_serves_hashed_assets_with_long_caching(tmp_path):
    async with web_client(tmp_path) as client:
        bundle = await client.get(f"/{BUNDLE}")
        assert bundle.status_code == 200
        assert bundle.headers["cache-control"] == "public, max-age=31536000, immutable"
        assert (await client.get("/sw.js")).headers["cache-control"] == "no-cache"


@pytest.mark.asyncio
async def test_missing_files_and_unknown_api_paths_are_real_404s(tmp_path):
    async with web_client(tmp_path) as client:
        missing_asset = await client.get("/_expo/static/js/web/missing-0123456789abcdef.js")
        assert missing_asset.status_code == 404
        unknown_api = await client.get("/api/does-not-exist")
        assert unknown_api.status_code == 404
        assert unknown_api.headers["content-type"].startswith("application/json")
        for traversal in ("/..%2f..%2fetc%2fpasswd", "/%2e%2e/%2e%2e/etc/passwd"):
            response = await client.get(traversal)
            assert response.status_code in (404, 200), traversal
            assert "root:" not in response.text


@pytest.mark.asyncio
async def test_api_routes_still_win_and_are_never_cached(tmp_path):
    async with web_client(tmp_path) as client:
        health = await client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["ok"] is True
        assert health.headers["cache-control"] == "no-store"
        assert health.headers["x-content-type-options"] == "nosniff"
        assert health.headers["x-frame-options"] == "DENY"
        assert (await client.get("/api/profile")).status_code == 401


def test_misconfigured_web_dist_fails_at_startup(tmp_path):
    with pytest.raises(RuntimeError, match="no index.html"):
        create_app(
            database_path=str(tmp_path / "web.db"),
            settings=Settings(_env_file=None, app_env="test", web_dist_dir=str(tmp_path / "empty")),
        )


@pytest.mark.asyncio
async def test_large_responses_are_gzip_compressed(tmp_path):
    dist = build_dist(tmp_path / "dist")
    (dist / BUNDLE).write_text("console.log('relish');\n" * 400)
    app = create_app(
        database_path=str(tmp_path / "gzip.db"),
        settings=Settings(_env_file=None, app_env="test", web_dist_dir=str(dist)),
    )
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        compressed = await client.get(f"/{BUNDLE}", headers={"Accept-Encoding": "gzip"})
        assert compressed.headers.get("content-encoding") == "gzip"
        assert compressed.text.startswith("console.log('relish');")
        assert compressed.headers["cache-control"] == "public, max-age=31536000, immutable"

        small = await client.get("/api/health", headers={"Accept-Encoding": "gzip"})
        assert "content-encoding" not in small.headers
