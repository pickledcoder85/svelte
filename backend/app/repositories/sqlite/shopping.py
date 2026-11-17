"""Shopping lists."""

from __future__ import annotations

from typing import Any
from uuid import uuid4


from ._base import _synchronized


class ShoppingMixin:
    def create_shopping_list(self, *, user_id: str, title: str, items: list[dict[str, Any]]) -> str:
        self._ensure_user_exists(user_id)
        identifier = str(uuid4())
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO shopping_lists (id, user_id, title) VALUES (?, ?, ?)", (identifier, user_id, title)
            )
            self._connection.executemany(
                """
                INSERT INTO shopping_list_items (id, list_id, name, amount, role, position)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (str(uuid4()), identifier, item["name"], item.get("amount") or "", item.get("role") or "other", position)
                    for position, item in enumerate(items)
                ],
            )
        return identifier

    @_synchronized
    def list_shopping_lists(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT lists.id, lists.title, lists.created_at, lists.updated_at,
                   COUNT(items.id) AS total,
                   COALESCE(SUM(CASE WHEN items.checked = 0 THEN 1 ELSE 0 END), 0) AS remaining
            FROM shopping_lists lists
            LEFT JOIN shopping_list_items items ON items.list_id = lists.id
            WHERE lists.user_id = ?
            GROUP BY lists.id
            ORDER BY lists.created_at DESC, lists.id
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    @_synchronized
    def get_shopping_list(self, user_id: str, list_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM shopping_lists WHERE id = ? AND user_id = ?", (list_id, user_id)
        ).fetchone()
        if row is None:
            return None
        items = self._connection.execute(
            "SELECT * FROM shopping_list_items WHERE list_id = ? ORDER BY position, created_at, id", (list_id,)
        ).fetchall()
        return {**dict(row), "items": [{**dict(item), "checked": bool(item["checked"])} for item in items]}

    def set_shopping_item_checked(self, *, user_id: str, list_id: str, item_id: str, checked: bool) -> bool:
        with self._lock, self._connection:
            cursor = self._connection.execute(
                """
                UPDATE shopping_list_items SET checked = ?
                WHERE id = ? AND list_id = ?
                  AND list_id IN (SELECT id FROM shopping_lists WHERE user_id = ?)
                """,
                (1 if checked else 0, item_id, list_id, user_id),
            )
            if cursor.rowcount:
                self._connection.execute(
                    "UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (list_id,)
                )
            return cursor.rowcount > 0

    def add_shopping_item(self, *, user_id: str, list_id: str, name: str, amount: str, role: str) -> bool:
        with self._lock, self._connection:
            owned = self._connection.execute(
                "SELECT 1 FROM shopping_lists WHERE id = ? AND user_id = ?", (list_id, user_id)
            ).fetchone()
            if owned is None:
                return False
            position = self._connection.execute(
                "SELECT COALESCE(MAX(position), -1) + 1 FROM shopping_list_items WHERE list_id = ?", (list_id,)
            ).fetchone()[0]
            self._connection.execute(
                """
                INSERT INTO shopping_list_items (id, list_id, name, amount, role, position)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (str(uuid4()), list_id, name, amount, role, position),
            )
            self._connection.execute("UPDATE shopping_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (list_id,))
            return True

    def delete_shopping_list(self, *, user_id: str, list_id: str) -> bool:
        with self._lock, self._connection:
            self._connection.execute(
                """
                DELETE FROM shopping_list_items
                WHERE list_id IN (SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?)
                """,
                (list_id, user_id),
            )
            cursor = self._connection.execute(
                "DELETE FROM shopping_lists WHERE id = ? AND user_id = ?", (list_id, user_id)
            )
            return cursor.rowcount > 0
