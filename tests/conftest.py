from pathlib import Path

import pytest
import pytest_asyncio
import httpx

from backend.app.main import create_app


@pytest.fixture()
def app(tmp_path: Path):
    db_path = tmp_path / "nutrition-test.db"
    return create_app(database_path=str(db_path))


@pytest.fixture()
def repository(app):
    return app.state.repository


@pytest_asyncio.fixture()
async def client(app) -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
