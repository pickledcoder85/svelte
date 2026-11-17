"""Connection setup, durability pragmas, migrations, seeding and the connection lock."""

from __future__ import annotations

import functools
import sqlite3
import threading
from pathlib import Path

from backend.app.db.database import apply_pending_migrations

from ._constants import DEFAULT_FOOD_CATALOG_SEEDS


def _synchronized(method):
    """Run a repository read under the connection lock.

    All access goes through one sqlite3 connection, which must not be used from two threads
    at once. The lock is re-entrant, so a locked method may call these reads.
    """

    @functools.wraps(method)
    def wrapper(self, *args, **kwargs):
        with self._lock:
            return method(self, *args, **kwargs)

    return wrapper


class SQLiteRepositoryBase:
    def __init__(self, database_path: str) -> None:
        self.database_path = database_path
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._lock = threading.RLock()
        self._configure_durability()
        with self._lock:
            apply_pending_migrations(self._connection)
        self._seed_data()

    def _configure_durability(self) -> None:
        """WAL keeps readers and the writer from blocking each other and survives crashes
        better; NORMAL sync is safe with WAL; busy_timeout waits briefly instead of failing."""
        self._connection.execute("PRAGMA foreign_keys = ON")
        if self.database_path != ":memory:":
            self._connection.execute("PRAGMA journal_mode = WAL")
        self._connection.execute("PRAGMA synchronous = NORMAL")
        self._connection.execute("PRAGMA busy_timeout = 5000")

    @_synchronized
    def journal_mode(self) -> str:
        return str(self._connection.execute("PRAGMA journal_mode").fetchone()[0]).lower()

    def _seed_data(self) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT OR IGNORE INTO weekly_metrics (
                    id, calorie_goal, calories_consumed,
                    protein_target, carbs_target, fat_target,
                    protein_consumed, carbs_consumed, fat_consumed,
                    weekly_weight_change, adherence_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (1, 14800, 10360, 980, 1260, 420, 742, 901, 308, -1.2, 87),
            )
            self._connection.executemany(
                """
                INSERT OR IGNORE INTO food_catalog (
                    id, name, brand, calories, serving_size, serving_unit,
                    protein, carbs, fat, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        seed["id"],
                        seed["name"],
                        seed["brand"],
                        seed["calories"],
                        seed["serving_size"],
                        seed["serving_unit"],
                        seed["protein"],
                        seed["carbs"],
                        seed["fat"],
                        seed["source"],
                    )
                    for seed in DEFAULT_FOOD_CATALOG_SEEDS
                ],
            )
            self._connection.executemany(
                """
                INSERT OR IGNORE INTO default_favorite_foods (
                    food_id, food_name, brand, calories, serving_size,
                    serving_unit, protein, carbs, fat, source, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        seed["id"],
                        seed["name"],
                        seed["brand"],
                        seed["calories"],
                        seed["serving_size"],
                        seed["serving_unit"],
                        seed["protein"],
                        seed["carbs"],
                        seed["fat"],
                        seed["source"],
                        index + 1,
                    )
                    for index, seed in enumerate(DEFAULT_FOOD_CATALOG_SEEDS)
                ],
            )

    @_synchronized
    def _ensure_user_exists(self, user_id: str) -> None:
        row = self._connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is not None:
            return

        placeholder_email = f"{user_id}@local.invalid"
        self.ensure_user_identity(user_id=user_id, email=placeholder_email)

    @_synchronized
    def close(self) -> None:
        self._connection.close()
