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


def applied_migrations(connection: sqlite3.Connection) -> set[str]:
    ensure_schema_migrations_table(connection)
    rows = connection.execute("SELECT version FROM schema_migrations").fetchall()
    return {row["version"] for row in rows}


def migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def apply_migrations(database_url: str | None = None) -> None:
    with connect(database_url) as connection:
        completed = applied_migrations(connection)

        for migration_file in migration_files():
            version = migration_file.stem
            if version in completed:
                continue

            connection.executescript(migration_file.read_text(encoding="utf-8"))
            connection.execute(
                "INSERT INTO schema_migrations (version) VALUES (?)",
                (version,),
            )

        connection.commit()


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
