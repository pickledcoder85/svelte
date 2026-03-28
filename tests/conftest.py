from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "nutrition-test.db"
    app = create_app(database_path=str(db_path))
    return TestClient(app)
