from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Iterable

DEFAULT_DATABASE_URL = "sqlite:///./nutrition_os.db"
MIGRATIONS_DIR = Path(__file__).with_name("migrations")


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def resolve_sqlite_path(database_url: str | None = None) -> str:
    url = database_url or get_database_url()

    if url == "sqlite:///:memory:":
        return ":memory:"

    if not url.startswith("sqlite:///"):
        raise ValueError("Only sqlite:/// URLs are supported for the initial database layer.")

    raw_path = url.removeprefix("sqlite:///")
    path = Path(raw_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    return str(path)


def connect(database_url: str | None = None) -> sqlite3.Connection:
    path = resolve_sqlite_path(database_url)
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def ensure_schema_migrations_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    row = connection.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
        """,
        (table_name,),
    ).fetchone()
    return row is not None


def user_tables(connection: sqlite3.Connection) -> list[str]:
    rows = connection.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    ).fetchall()
    return [row["name"] for row in rows]


def applied_migrations(connection: sqlite3.Connection) -> set[str]:
    ensure_schema_migrations_table(connection)
    rows = connection.execute("SELECT version FROM schema_migrations").fetchall()
    return {row["version"] for row in rows}


def migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def migration_already_reflected(connection: sqlite3.Connection, version: str) -> bool:
    if version == "010_planned_exercise_completion":
        columns = table_columns(connection, "planned_exercise_entries")
        return {"completed_at", "completed_exercise_entry_id"}.issubset(columns)

    if version == "011_planned_workout_structure":
        return all(
            table_exists(connection, table_name)
            for table_name in (
                "planned_workout_sessions",
                "planned_workout_blocks",
                "planned_workout_segments",
            )
        )

    return False


def adopt_legacy_database(connection: sqlite3.Connection) -> None:
    existing_tables = set(user_tables(connection))
    if not existing_tables or existing_tables == {"schema_migrations"}:
        return

    ensure_schema_migrations_table(connection)
    completed = {
        row["version"]
        for row in connection.execute("SELECT version FROM schema_migrations").fetchall()
    }
    if completed:
        return
    connection.executemany(
        "INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)",
        [(migration_file.stem,) for migration_file in migration_files()],
    )
    connection.commit()


def apply_migrations(database_url: str | None = None) -> None:
    with connect(database_url) as connection:
        adopt_legacy_database(connection)
        completed = applied_migrations(connection)

        for migration_file in migration_files():
            version = migration_file.stem
            if version in completed:
                continue

            if migration_already_reflected(connection, version):
                connection.execute(
                    "INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)",
                    (version,),
                )
                continue

            connection.executescript(migration_file.read_text(encoding="utf-8"))
            connection.execute(
                "INSERT INTO schema_migrations (version) VALUES (?)",
                (version,),
            )

        connection.commit()


def reset_database(database_url: str | None = None) -> str:
    path = resolve_sqlite_path(database_url)
    if path == ":memory:":
        raise ValueError("Reset is not supported for in-memory SQLite databases.")
    database_file = Path(path)
    if database_file.exists():
        database_file.unlink()
    return path


def fetch_all(connection: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
    rows = connection.execute(sql, tuple(params)).fetchall()
    return [dict(row) for row in rows]


def fetch_one(
    connection: sqlite3.Connection, sql: str, params: Iterable[Any] = ()
) -> dict[str, Any] | None:
    row = connection.execute(sql, tuple(params)).fetchone()
    return dict(row) if row is not None else None


def execute(connection: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> str:
    cursor = connection.execute(sql, tuple(params))
    return str(cursor.lastrowid)


def json_text(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True)
