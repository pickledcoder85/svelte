from pathlib import Path

import pytest
import pytest_asyncio
import httpx

from backend.app.main import create_app


@pytest_asyncio.fixture()
async def client(tmp_path: Path) -> httpx.AsyncClient:
    db_path = tmp_path / "nutrition-test.db"
    app = create_app(database_path=str(db_path))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
