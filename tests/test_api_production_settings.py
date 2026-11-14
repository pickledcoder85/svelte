from pathlib import Path

import httpx
import pytest

from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.routes.vision import SCAN_FAILED_MESSAGE
from tests.conftest import TINY_PNG_BASE64

OWNER = "owner@example.com"
OWNER_HEADERS = {"Tailscale-User-Login": OWNER, "X-Relish-Request": "1"}


def production_client(tmp_path: Path, **overrides) -> httpx.AsyncClient:
    values = {
        "app_env": "production",
        "auth_mode": "tailscale",
        "owner_email": OWNER,
        "openai_api_key": "",
        "database_url": f"sqlite:///{tmp_path / 'prod.db'}",
        "backup_dir": str(tmp_path / "backups"),
    }
    values.update(overrides)
    app = create_app(
        database_path=str(tmp_path / "prod.db"),
        settings=Settings(_env_file=None, **values),
    )
    transport = httpx.ASGITransport(app=app, client=("127.0.0.1", 51234))
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


@pytest.mark.asyncio
async def test_production_scans_refuse_to_fake_results_without_a_key(tmp_path):
    async with production_client(tmp_path) as client:
        for path in ("/api/vision/label", "/api/vision/label/ingest", "/api/vision/package"):
            response = await client.post(path, headers=OWNER_HEADERS, json={"image_base64": TINY_PNG_BASE64})
            assert response.status_code == 503, path
            assert response.json()["detail"] == "Scanning is not set up on this server."


@pytest.mark.asyncio
async def test_scan_failures_return_a_generic_message(tmp_path, monkeypatch):
    async def failing_request(*_args, **_kwargs):
        raise ValueError("upstream said: secret internal detail")

    monkeypatch.setattr("backend.app.services.vision._request_vision_json", failing_request)
    async with production_client(tmp_path, openai_api_key="sk-test") as client:
        response = await client.post(
            "/api/vision/label",
            headers=OWNER_HEADERS,
            json={"image_base64": TINY_PNG_BASE64},
        )
    assert response.status_code == 502
    assert response.json()["detail"] == SCAN_FAILED_MESSAGE


@pytest.mark.asyncio
async def test_bad_images_return_a_readable_400(tmp_path):
    async with production_client(tmp_path, openai_api_key="sk-test") as client:
        response = await client.post(
            "/api/vision/label",
            headers=OWNER_HEADERS,
            json={"image_base64": "aGVsbG8gd29ybGQ="},
        )
    assert response.status_code == 400
    assert "Unsupported image format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_production_hides_api_docs_and_server_details(tmp_path):
    async with production_client(tmp_path) as client:
        for path in ("/docs", "/redoc", "/openapi.json"):
            assert (await client.get(path)).status_code == 404, path
        health = (await client.get("/api/health")).json()
    assert "database" not in health
    assert health["ok"] is True


@pytest.mark.asyncio
async def test_development_keeps_api_docs(client):
    assert (await client.get("/openapi.json")).status_code == 200


def test_production_requires_an_absolute_database_url(tmp_path):
    settings = Settings(
        _env_file=None,
        app_env="production",
        auth_mode="tailscale",
        owner_email=OWNER,
        database_url="sqlite:///./relish.db",
        backup_dir=str(tmp_path / "backups"),
    )
    with pytest.raises(RuntimeError, match="absolute DATABASE_URL"):
        create_app(database_path=str(tmp_path / "x.db"), settings=settings)
