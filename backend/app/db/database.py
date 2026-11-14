from __future__ import annotations

import json
import os
import re
import sqlite3
from pathlib import Path
from typing import Any

DEFAULT_DATABASE_URL = "sqlite:///./nutrition_os.db"
MIGRATIONS_DIR = Path(__file__).with_name("migrations")
MIGRATION_NAME = re.compile(r"^(\d{3})_[a-z0-9_]+\.sql$")
RESET_HINT = "Reset it with `python -m backend.app.db.bootstrap --reset` (this deletes its data)."


class DatabaseSchemaError(RuntimeError):
    """The database file was not created by this schema history and cannot be migrated."""


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


def migration_files() -> list[Path]:
    """Numbered migrations in order. Names must be unique, three-digit, and snake_case."""
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    seen: dict[str, Path] = {}
    for path in files:
        match = MIGRATION_NAME.match(path.name)
        if not match:
            raise DatabaseSchemaError(f"Badly named migration file: {path.name}")
        number = match.group(1)
        if number in seen:
            raise DatabaseSchemaError(f"Duplicate migration number {number}: {seen[number].name}, {path.name}")
        seen[number] = path
    return files


def _user_tables(connection: sqlite3.Connection) -> set[str]:
    rows = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    return {row[0] for row in rows}


def apply_pending_migrations(connection: sqlite3.Connection) -> list[str]:
    """Apply every migration not yet recorded, each in its own transaction.

    Refuses databases from before the 001 baseline (tables but no schema history, or
    recorded versions this code does not know) instead of guessing how to repair them.
    Returns the versions applied by this call.
    """
    files = migration_files()
    known_versions = {path.stem for path in files}
    tables = _user_tables(connection)

    if tables and "schema_migrations" not in tables:
        raise DatabaseSchemaError(f"This database predates the schema baseline. {RESET_HINT}")

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.commit()
    applied = {row[0] for row in connection.execute("SELECT version FROM schema_migrations").fetchall()}
    unknown = sorted(applied - known_versions)
    if unknown:
        raise DatabaseSchemaError(
            f"This database records migrations this version does not know ({', '.join(unknown)}). "
            f"It was created by an older or newer schema history. {RESET_HINT}"
        )

    newly_applied: list[str] = []
    for path in files:
        version = path.stem
        if version in applied:
            continue
        script = path.read_text(encoding="utf-8")
        try:
            connection.execute("BEGIN")
            for statement in _split_statements(script):
                connection.execute(statement)
            connection.execute("INSERT INTO schema_migrations (version) VALUES (?)", (version,))
            connection.execute("COMMIT")
        except Exception:
            connection.execute("ROLLBACK")
            raise
        newly_applied.append(version)
    return newly_applied


def _split_statements(script: str) -> list[str]:
    """Split a migration into statements so they run inside one explicit transaction.

    `executescript` would commit first and run outside our transaction. sqlite3's
    `complete_statement` handles semicolons inside strings and CREATE TRIGGER bodies.
    """
    statements: list[str] = []
    buffer = ""
    for line in script.splitlines(keepends=True):
        stripped = line.strip()
        if not buffer.strip() and (not stripped or stripped.startswith("--")):
            buffer = ""
            continue
        buffer += line
        if sqlite3.complete_statement(buffer):
            if buffer.strip().rstrip(";").strip():
                statements.append(buffer.strip())
            buffer = ""
    if buffer.strip():
        raise DatabaseSchemaError("Migration ends with an incomplete SQL statement.")
    return statements


def apply_migrations(database_url: str | None = None) -> list[str]:
    connection = connect(database_url)
    try:
        return apply_pending_migrations(connection)
    finally:
        connection.close()


def reset_database(database_url: str | None = None) -> str:
    path = resolve_sqlite_path(database_url)
    if path == ":memory:":
        raise ValueError("Reset is not supported for in-memory SQLite databases.")
    for suffix in ("", "-wal", "-shm", "-journal"):
        database_file = Path(f"{path}{suffix}")
        if database_file.exists():
            database_file.unlink()
    return path


def json_text(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True)
