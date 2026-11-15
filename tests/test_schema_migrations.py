import sqlite3
from pathlib import Path

import pytest

import backend.app.db.database as database
from backend.app.db.database import (
    DatabaseSchemaError,
    _split_statements,
    apply_migrations,
    apply_pending_migrations,
    migration_files,
    reset_database,
)
from backend.app.repositories.sqlite import SQLiteRepository


def _schema(connection: sqlite3.Connection) -> set[tuple[str, str, str]]:
    rows = connection.execute(
        """
        SELECT type, name, sql FROM sqlite_master
        WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations'
        """
    ).fetchall()
    return {(row[0], row[1], row[2]) for row in rows}


def test_migrations_start_with_the_baseline_in_order():
    names = [path.name for path in migration_files()]
    assert names[0] == "001_baseline.sql"
    assert names == sorted(names)
    assert "002_food_barcodes.sql" in names


def test_fresh_database_gets_every_migration_once(tmp_path):
    db_url = f"sqlite:///{tmp_path / 'fresh.db'}"
    expected = [path.stem for path in migration_files()]
    assert apply_migrations(db_url) == expected
    assert apply_migrations(db_url) == []

    connection = sqlite3.connect(tmp_path / "fresh.db")
    versions = [row[0] for row in connection.execute("SELECT version FROM schema_migrations")]
    tables = {name for kind, name, _ in _schema(connection) if kind == "table"}
    connection.close()
    assert versions == [path.stem for path in migration_files()]
    assert len(tables) == 29  # 28 baseline tables + user_food_bank (005)
    assert {"users", "food_catalog", "food_logs", "planned_workout_sessions", "recipes", "user_food_bank"} <= tables
    assert "food_items" not in tables  # the old, unused migration schema is gone


def test_repository_builds_the_same_schema_and_seeds_reference_data(tmp_path):
    repo = SQLiteRepository(str(tmp_path / "repo.db"))
    repo_schema = _schema(repo._connection)
    assert repo._connection.execute("PRAGMA foreign_keys").fetchone()[0] == 1
    assert len(repo.list_foods()) >= 21
    repo.close()

    apply_migrations(f"sqlite:///{tmp_path / 'runner.db'}")
    runner = sqlite3.connect(tmp_path / "runner.db")
    assert _schema(runner) == repo_schema
    runner.close()

    # Reopening an up-to-date database applies nothing and keeps data.
    reopened = SQLiteRepository(str(tmp_path / "repo.db"))
    assert len(reopened.list_foods()) >= 21
    reopened.close()


def test_pre_baseline_databases_are_refused(tmp_path):
    legacy = sqlite3.connect(tmp_path / "legacy.db")
    legacy.execute("CREATE TABLE users (id TEXT PRIMARY KEY)")
    legacy.commit()
    with pytest.raises(DatabaseSchemaError, match="predates the schema baseline"):
        apply_pending_migrations(legacy)
    legacy.close()

    old_history = sqlite3.connect(tmp_path / "old-history.db")
    old_history.execute("CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT)")
    old_history.execute("INSERT INTO schema_migrations (version) VALUES ('001_initial')")
    old_history.commit()
    with pytest.raises(DatabaseSchemaError, match="001_initial"):
        apply_pending_migrations(old_history)
    old_history.close()


def test_a_failing_migration_rolls_back_completely(tmp_path, monkeypatch):
    migrations = tmp_path / "migrations"
    migrations.mkdir()
    (migrations / "001_baseline.sql").write_text("CREATE TABLE things (id INTEGER PRIMARY KEY);\n")
    (migrations / "002_broken.sql").write_text(
        "CREATE TABLE half_done (id INTEGER);\nINSERT INTO missing_table VALUES (1);\n"
    )
    monkeypatch.setattr(database, "MIGRATIONS_DIR", migrations)

    connection = sqlite3.connect(tmp_path / "rollback.db")
    with pytest.raises(sqlite3.OperationalError):
        apply_pending_migrations(connection)

    tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    versions = {row[0] for row in connection.execute("SELECT version FROM schema_migrations")}
    connection.close()
    assert "things" in tables and "half_done" not in tables
    assert versions == {"001_baseline"}


@pytest.mark.parametrize(
    "names, message",
    [
        (["001_baseline.sql", "001_other.sql"], "Duplicate migration number"),
        (["1_bad-name.sql"], "Badly named migration"),
    ],
)
def test_migration_names_are_validated(tmp_path, monkeypatch, names, message):
    for name in names:
        (tmp_path / name).write_text("SELECT 1;\n")
    monkeypatch.setattr(database, "MIGRATIONS_DIR", tmp_path)
    with pytest.raises(DatabaseSchemaError, match=message):
        migration_files()


def test_statement_splitting_respects_strings_comments_and_triggers():
    script = """
-- a comment; with a semicolon
CREATE TABLE notes (body TEXT DEFAULT 'a;b');
CREATE TRIGGER notes_touch AFTER INSERT ON notes BEGIN
    UPDATE notes SET body = body || ';' WHERE rowid = NEW.rowid;
END;
"""
    statements = _split_statements(script)
    assert len(statements) == 2
    assert statements[0].startswith("CREATE TABLE notes")
    assert statements[1].startswith("CREATE TRIGGER notes_touch")


def test_reset_removes_wal_and_shared_memory_files(tmp_path):
    db_path = tmp_path / "reset.db"
    for suffix in ("", "-wal", "-shm"):
        Path(f"{db_path}{suffix}").write_text("x")
    reset_database(f"sqlite:///{db_path}")
    assert not any(Path(f"{db_path}{suffix}").exists() for suffix in ("", "-wal", "-shm"))


def test_existing_baseline_database_gets_the_barcode_column(tmp_path, monkeypatch):
    """A database created before 002 (only the baseline applied) is upgraded in place."""
    import backend.app.db.database as db

    only_baseline = tmp_path / "only-baseline"
    only_baseline.mkdir()
    (only_baseline / "001_baseline.sql").write_text((db.MIGRATIONS_DIR / "001_baseline.sql").read_text())
    real_dir = db.MIGRATIONS_DIR
    monkeypatch.setattr(db, "MIGRATIONS_DIR", only_baseline)
    apply_migrations(f"sqlite:///{tmp_path / 'upgrade.db'}")
    monkeypatch.setattr(db, "MIGRATIONS_DIR", real_dir)

    assert apply_migrations(f"sqlite:///{tmp_path / 'upgrade.db'}") == ["002_food_barcodes", "003_calorie_floor", "004_workout_calories_share", "005_food_bank"]
    connection = sqlite3.connect(tmp_path / "upgrade.db")
    columns = {row[1] for row in connection.execute("PRAGMA table_info(food_catalog)")}
    floor = connection.execute("SELECT dflt_value FROM pragma_table_info('user_profiles') WHERE name = 'calorie_floor'").fetchone()
    connection.close()
    assert "barcode" in columns
    assert floor == ("'recommended'",)
