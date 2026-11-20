"""Food catalog and per-user food bank."""

from __future__ import annotations

import json
import sqlite3

from backend.app.models.nutrition import FoodItem, FoodPortion, MacroTargets
from backend.app.services.servings import parse_serving_text

from ._base import _synchronized


class FoodsMixin:
    def _row_to_food(self, row: sqlite3.Row) -> FoodItem:
        keys = row.keys()
        serving_grams = row["serving_grams"] if "serving_grams" in keys else None
        serving_basis = row["serving_basis"] if "serving_basis" in keys else None
        serving_text = row["serving_text"] if "serving_text" in keys else None
        if serving_grams is None:
            # Older rows kept the label weight inside the unit ("tbsp (32 g)"): read it back.
            parsed = parse_serving_text(serving_text or f"{row['serving_size']:g} {row['serving_unit']}")
            if parsed and parsed.grams:
                serving_grams, serving_basis = parsed.grams, parsed.basis
        portions: list[FoodPortion] = []
        if "portions_json" in keys and row["portions_json"]:
            try:
                portions = [FoodPortion(**item) for item in json.loads(row["portions_json"])]
            except (ValueError, TypeError):
                portions = []
        return FoodItem(
            id=row["id"],
            name=row["name"],
            brand=row["brand"],
            calories=row["calories"],
            serving_size=row["serving_size"],
            serving_unit=row["serving_unit"],
            macros=MacroTargets(protein=row["protein"], carbs=row["carbs"], fat=row["fat"]),
            source=row["source"],
            barcode=row["barcode"] if "barcode" in keys else None,
            serving_text=serving_text,
            serving_grams=serving_grams,
            serving_basis=serving_basis,
            portions=portions,
        )

    @_synchronized
    def list_foods(self) -> list[FoodItem]:
        rows = self._connection.execute("SELECT * FROM food_catalog ORDER BY name").fetchall()
        return [self._row_to_food(row) for row in rows]

    @_synchronized
    def get_food_by_id(self, food_id: str) -> FoodItem | None:
        row = self._connection.execute(
            "SELECT * FROM food_catalog WHERE id = ?",
            (food_id,),
        ).fetchone()
        if row is None:
            return None
        return self._row_to_food(row)

    @_synchronized
    def get_food_by_barcode(self, barcode: str) -> FoodItem | None:
        row = self._connection.execute(
            "SELECT * FROM food_catalog WHERE barcode = ?",
            (barcode,),
        ).fetchone()
        return self._row_to_food(row) if row is not None else None

    @_synchronized
    def search_foods(self, query: str) -> list[FoodItem]:
        normalized = query.strip()
        if not normalized:
            return self.list_foods()
        rows = self._connection.execute(
            """
            SELECT * FROM food_catalog
            WHERE LOWER(name) LIKE LOWER(?) OR LOWER(COALESCE(brand, '')) LIKE LOWER(?)
            ORDER BY name
            """,
            (f"%{normalized}%", f"%{normalized}%"),
        ).fetchall()
        return [self._row_to_food(row) for row in rows]

    def save_food_item(self, food_item: FoodItem) -> FoodItem:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO food_catalog (
                    id, name, brand, calories, serving_size, serving_unit,
                    protein, carbs, fat, source, barcode,
                    serving_text, serving_grams, serving_basis, portions_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    barcode = COALESCE(excluded.barcode, food_catalog.barcode),
                    -- A known weight (perhaps the user weighed it) survives a re-save without one,
                    -- but only while the serving is the same; a different serving starts fresh.
                    serving_text = CASE WHEN excluded.serving_size = food_catalog.serving_size
                        AND excluded.serving_unit = food_catalog.serving_unit
                        THEN COALESCE(excluded.serving_text, food_catalog.serving_text) ELSE excluded.serving_text END,
                    serving_grams = CASE WHEN excluded.serving_size = food_catalog.serving_size
                        AND excluded.serving_unit = food_catalog.serving_unit
                        THEN COALESCE(excluded.serving_grams, food_catalog.serving_grams) ELSE excluded.serving_grams END,
                    serving_basis = CASE WHEN excluded.serving_size = food_catalog.serving_size
                        AND excluded.serving_unit = food_catalog.serving_unit
                        THEN COALESCE(excluded.serving_basis, food_catalog.serving_basis) ELSE excluded.serving_basis END,
                    portions_json = COALESCE(excluded.portions_json, food_catalog.portions_json),
                    name = excluded.name,
                    brand = excluded.brand,
                    calories = excluded.calories,
                    serving_size = excluded.serving_size,
                    serving_unit = excluded.serving_unit,
                    protein = excluded.protein,
                    carbs = excluded.carbs,
                    fat = excluded.fat,
                    source = excluded.source
                """,
                (
                    food_item.id,
                    food_item.name,
                    food_item.brand,
                    food_item.calories,
                    food_item.serving_size,
                    food_item.serving_unit,
                    food_item.macros.protein,
                    food_item.macros.carbs,
                    food_item.macros.fat,
                    food_item.source,
                    food_item.barcode,
                    food_item.serving_text,
                    food_item.serving_grams,
                    food_item.serving_basis if food_item.serving_grams else None,
                    json.dumps([portion.model_dump() for portion in food_item.portions]) if food_item.portions else None,
                ),
            )
        persisted = self.get_food_by_id(food_item.id)
        if persisted is None:
            raise RuntimeError("Failed to persist food item.")
        return persisted

    # --- Food bank: the foods a user has scanned, saved, or logged ---

    def add_to_food_bank(self, *, user_id: str, food_id: str, used: bool = False) -> None:
        """Add a food to the user's bank (no-op if there). `used` (it was logged) also marks it
        recently used and counts the use, for ranking usual foods first."""
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO user_food_bank (user_id, food_id, last_used_at, use_count)
                VALUES (?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP END, CASE WHEN ? THEN 1 ELSE 0 END)
                ON CONFLICT(user_id, food_id) DO UPDATE SET
                    last_used_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE user_food_bank.last_used_at END,
                    use_count = user_food_bank.use_count + CASE WHEN ? THEN 1 ELSE 0 END
                """,
                (user_id, food_id, used, used, used, used),
            )

    @_synchronized
    def food_bank_use_counts(self, user_id: str) -> dict[str, int]:
        rows = self._connection.execute(
            "SELECT food_id, use_count FROM user_food_bank WHERE user_id = ?", (user_id,)
        ).fetchall()
        return {row["food_id"]: row["use_count"] for row in rows}

    def remove_from_food_bank(self, *, user_id: str, food_id: str) -> bool:
        with self._lock, self._connection:
            cursor = self._connection.execute(
                "DELETE FROM user_food_bank WHERE user_id = ? AND food_id = ?",
                (user_id, food_id),
            )
        return cursor.rowcount > 0

    @_synchronized
    def food_bank_ids(self, user_id: str) -> set[str]:
        rows = self._connection.execute("SELECT food_id FROM user_food_bank WHERE user_id = ?", (user_id,)).fetchall()
        return {row["food_id"] for row in rows}

    @_synchronized
    def list_food_bank(self, user_id: str, query: str = "") -> list[FoodItem]:
        """The user's bank, usual foods first, optionally filtered by name or brand.

        Usual = logged often and recently: the use count, with each use fading by half about every
        two weeks since the food was last logged. Foods never logged follow, newest first."""
        normalized = query.strip()
        rows = self._connection.execute(
            """
            SELECT f.* FROM user_food_bank b
            JOIN food_catalog f ON f.id = b.food_id
            WHERE b.user_id = ?
              AND (? = '' OR LOWER(f.name) LIKE LOWER(?) OR LOWER(COALESCE(f.brand, '')) LIKE LOWER(?))
            -- Usual foods first (often and recently logged), then foods only added (newest first).
            ORDER BY b.last_used_at IS NULL,
                     b.use_count / (1.0 + MAX(0.0, julianday('now') - julianday(b.last_used_at)) / 14.0) DESC,
                     b.last_used_at DESC, b.added_at DESC, b.rowid DESC
            """,
            (user_id, normalized, f"%{normalized}%", f"%{normalized}%"),
        ).fetchall()
        return [self._row_to_food(row).model_copy(update={"in_bank": True}) for row in rows]

    def set_serving_weight(self, *, food_id: str, serving_grams: float, serving_basis: str) -> FoodItem | None:
        """Record the weight of one serving (e.g. the user weighed one packet)."""
        with self._lock, self._connection:
            self._connection.execute(
                "UPDATE food_catalog SET serving_grams = ?, serving_basis = ? WHERE id = ?",
                (serving_grams, serving_basis, food_id),
            )
        return self.get_food_by_id(food_id)
