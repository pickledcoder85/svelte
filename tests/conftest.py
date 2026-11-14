from pathlib import Path

import pytest
import pytest_asyncio
import httpx

from backend.app.config import Settings
from backend.app.main import create_app


def isolated_test_settings() -> Settings:
    """Local-mode settings that ignore the developer's .env and environment auth flags."""
    return Settings(
        _env_file=None,
        app_env="test",
        auth_mode="local",
        owner_email="",
        dev_auto_login=False,
        # Never call the paid vision API from tests, even if a key is exported in the shell.
        openai_api_key="",
    )


# A real 1x1 PNG, so scans pass image validation and reach the demo fallback.
TINY_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


@pytest.fixture()
def app(tmp_path: Path):
    db_path = tmp_path / "nutrition-test.db"
    return create_app(database_path=str(db_path), settings=isolated_test_settings())


@pytest.fixture()
def repository(app):
    return app.state.repository


@pytest_asyncio.fixture()
async def client(app) -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest_asyncio.fixture()
async def auth_headers(client) -> dict[str, str]:
    """Bearer headers for a local (development/test) session."""
    response = await client.post(
        "/api/auth/session",
        json={"email": "owner@example.com", "display_name": "Owner"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['session']['access_token']}"}
