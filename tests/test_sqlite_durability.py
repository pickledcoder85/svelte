import sqlite3
import threading
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import pytest

from backend.app.config import Settings
from backend.app.db.backup import backup_database, prune_backups
from backend.app.main import create_app
from backend.app.repositories.sqlite import SQLiteRepository


def _row_count(path: Path, table: str) -> int:
    connection = sqlite3.connect(path)
    try:
        return connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    finally:
        connection.close()


def test_file_databases_use_wal_and_a_busy_timeout(tmp_path):
    repo = SQLiteRepository(str(tmp_path / "wal.db"))
    assert repo.journal_mode() == "wal"
    assert repo._connection.execute("PRAGMA busy_timeout").fetchone()[0] == 5000
    assert repo._connection.execute("PRAGMA synchronous").fetchone()[0] == 1  # NORMAL
    repo.close()


def test_repository_is_safe_under_concurrent_threads(tmp_path):
    repo = SQLiteRepository(str(tmp_path / "threads.db"))
    repo.ensure_user_identity(user_id="user-1", email="owner@example.com")
    errors: list[BaseException] = []

    def worker(offset: int) -> None:
        try:
            for index in range(25):
                repo.create_exercise_entry(
                    user_id="user-1",
                    title=f"Walk {offset}-{index}",
                    duration_minutes=10,
                    calories_burned=50,
                    logged_on=date(2026, 4, 1),
                    logged_at="07:00",
                    intensity="Low",
                )
                repo.list_exercise_entries("user-1")
                repo.get_user_identity("user-1")
        except BaseException as error:  # noqa: BLE001 - surface any thread failure
            errors.append(error)

    threads = [threading.Thread(target=worker, args=(offset,)) for offset in range(6)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)

    assert errors == []
    assert len(repo.list_exercise_entries("user-1")) == 150
    repo.close()


def test_backup_writes_a_consistent_snapshot_and_prunes_old_ones(tmp_path):
    db_path = tmp_path / "live.db"
    repo = SQLiteRepository(str(db_path))
    repo.ensure_user_identity(user_id="user-1", email="owner@example.com")
    repo.record_weight_entry(user_id="user-1", recorded_at=date(2026, 4, 1), weight_lbs=180)

    backups = tmp_path / "backups"
    start = datetime(2026, 4, 1, tzinfo=UTC)
    snapshots = [
        backup_database(db_path, backups, keep=3, now=start + timedelta(minutes=index))
        for index in range(5)
    ]
    repo.close()

    remaining = sorted(path.name for path in backups.iterdir())
    assert remaining == sorted(path.name for path in snapshots[-3:] if path)
    assert _row_count(snapshots[-1], "weight_entries") == 1
    assert _row_count(snapshots[-1], "users") == 1


def test_backup_skips_a_missing_database(tmp_path):
    assert backup_database(tmp_path / "missing.db", tmp_path / "backups") is None
    assert prune_backups(tmp_path, keep=1) == []


def test_startup_takes_a_backup_before_opening_the_database(tmp_path):
    db_path = tmp_path / "app.db"
    SQLiteRepository(str(db_path)).close()
    backups = tmp_path / "backups"
    create_app(
        database_path=str(db_path),
        settings=Settings(_env_file=None, app_env="test", backup_dir=str(backups), backup_keep=5),
    )
    snapshots = list(backups.glob("relish-*-startup.db"))
    assert len(snapshots) == 1


@pytest.mark.parametrize("backup_dir", ["", "relative/backups"])
def test_production_requires_an_absolute_backup_dir(tmp_path, backup_dir):
    settings = Settings(
        _env_file=None,
        app_env="production",
        auth_mode="tailscale",
        owner_email="owner@example.com",
        database_url=f"sqlite:///{tmp_path / 'prod.db'}",
        backup_dir=backup_dir,
    )
    with pytest.raises(RuntimeError, match="BACKUP_DIR"):
        create_app(database_path=str(tmp_path / "prod.db"), settings=settings)


@pytest.mark.asyncio
async def test_export_returns_the_owners_data_as_a_download(client, auth_headers):
    await client.post(
        "/api/profile/weights",
        headers=auth_headers,
        json={"recorded_at": "2026-04-01", "weight_lbs": 180},
    )
    await client.post(
        "/api/tracker/exercise",
        headers=auth_headers,
        json={
            "title": "Walk",
            "duration_minutes": 20,
            "calories_burned": 90,
            "logged_on": "2026-04-01",
            "logged_at": "07:00",
            "intensity": "Low",
        },
    )

    response = await client.get("/api/export", headers=auth_headers)

    assert response.status_code == 200
    assert response.headers["content-disposition"].startswith('attachment; filename="relish-export-')
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["format"] == "relish-export"
    assert body["format_version"] == 1
    assert body["profile"]["email"] == "owner@example.com"
    assert [entry["weight_lbs"] for entry in body["weight_entries"]] == [180]
    assert [entry["title"] for entry in body["exercise_entries"]] == ["Walk"]
    assert body["food_bank"], "the seeded food bank is exported"
    for key in ("goals", "food_logs", "planned_workout_sessions", "meal_plan_days", "favorites", "recipes"):
        assert key in body


@pytest.mark.asyncio
async def test_export_requires_a_session(client):
    assert (await client.get("/api/export")).status_code == 401


def test_every_repository_connection_use_holds_the_lock():
    """Static guard: each use of self._connection is inside `with self._lock` or a
    @_synchronized method, so the shared connection is never used by two threads at once."""
    import ast
    import inspect

    import backend.app.repositories.sqlite as module

    tree = ast.parse(inspect.getsource(module))
    repository = next(
        node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "SQLiteRepository"
    )
    exempt = {"__init__", "_configure_durability"}
    offenders: list[str] = []

    def visit(node: ast.AST, locked: bool, method: str) -> None:
        if isinstance(node, ast.With) and any(
            "self._lock" in ast.unparse(item.context_expr) for item in node.items
        ):
            locked = True
        if isinstance(node, ast.Attribute) and node.attr == "_connection" and not locked:
            offenders.append(f"{method}:{node.lineno}")
        for child in ast.iter_child_nodes(node):
            visit(child, locked, method)

    for method in repository.body:
        if not isinstance(method, ast.FunctionDef) or method.name in exempt:
            continue
        synchronized = any(ast.unparse(d) == "_synchronized" for d in method.decorator_list)
        for statement in method.body:
            visit(statement, synchronized, method.name)

    assert offenders == []
