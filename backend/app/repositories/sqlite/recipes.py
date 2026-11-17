"""Meal templates and recipes."""

from __future__ import annotations

import sqlite3

from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import MacroTargets
from backend.app.models.recipes import RecipeAsset, RecipeDefinition

from ._base import _synchronized


class RecipesMixin:
    def save_meal_template(self, meal_template: MealTemplate) -> MealTemplate:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO meal_templates (
                    id, name, serving_count, favorite, calories, protein, carbs, fat,
                    per_serving_calories, per_serving_protein, per_serving_carbs, per_serving_fat
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    serving_count = excluded.serving_count,
                    favorite = excluded.favorite,
                    calories = excluded.calories,
                    protein = excluded.protein,
                    carbs = excluded.carbs,
                    fat = excluded.fat,
                    per_serving_calories = excluded.per_serving_calories,
                    per_serving_protein = excluded.per_serving_protein,
                    per_serving_carbs = excluded.per_serving_carbs,
                    per_serving_fat = excluded.per_serving_fat
                """,
                (
                    meal_template.id,
                    meal_template.name,
                    meal_template.serving_count,
                    1 if meal_template.favorite else 0,
                    meal_template.calories,
                    meal_template.macros.protein,
                    meal_template.macros.carbs,
                    meal_template.macros.fat,
                    meal_template.per_serving_calories,
                    meal_template.per_serving_macros.protein,
                    meal_template.per_serving_macros.carbs,
                    meal_template.per_serving_macros.fat,
                ),
            )
            self._connection.execute(
                "DELETE FROM meal_template_ingredients WHERE meal_template_id = ?",
                (meal_template.id,),
            )
            self._connection.executemany(
                """
                INSERT INTO meal_template_ingredients (
                    meal_template_id, food_id, name, grams, calories_per_100g,
                    protein_per_100g, carbs_per_100g, fat_per_100g
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        meal_template.id,
                        ingredient.food_id,
                        ingredient.name,
                        ingredient.grams,
                        ingredient.calories_per_100g,
                        ingredient.macros_per_100g.protein,
                        ingredient.macros_per_100g.carbs,
                        ingredient.macros_per_100g.fat,
                    )
                    for ingredient in meal_template.ingredients
                ],
            )
        return meal_template

    @_synchronized
    def _row_to_meal_template(self, row: sqlite3.Row) -> MealTemplate:
        ingredient_rows = self._connection.execute(
            """
            SELECT * FROM meal_template_ingredients
            WHERE meal_template_id = ?
            ORDER BY id
            """,
            (row["id"],),
        ).fetchall()
        ingredients = [
            {
                "id": f"{row['id']}-{ingredient_row['id']}",
                "food_id": ingredient_row["food_id"],
                "name": ingredient_row["name"],
                "grams": ingredient_row["grams"],
                "calories_per_100g": ingredient_row["calories_per_100g"],
                "macros_per_100g": {
                    "protein": ingredient_row["protein_per_100g"],
                    "carbs": ingredient_row["carbs_per_100g"],
                    "fat": ingredient_row["fat_per_100g"],
                },
            }
            for ingredient_row in ingredient_rows
        ]
        return MealTemplate(
            id=row["id"],
            name=row["name"],
            serving_count=row["serving_count"],
            ingredients=ingredients,
            favorite=bool(row["favorite"]),
            calories=row["calories"],
            macros=MacroTargets(
                protein=row["protein"], carbs=row["carbs"], fat=row["fat"]
            ),
            per_serving_calories=row["per_serving_calories"],
            per_serving_macros=MacroTargets(
                protein=row["per_serving_protein"],
                carbs=row["per_serving_carbs"],
                fat=row["per_serving_fat"],
            ),
        )

    @_synchronized
    def list_meal_templates(self) -> list[MealTemplate]:
        rows = self._connection.execute("SELECT * FROM meal_templates ORDER BY name").fetchall()
        return [self._row_to_meal_template(row) for row in rows]

    @_synchronized
    def get_meal_template(self, meal_template_id: str) -> MealTemplate | None:
        row = self._connection.execute(
            "SELECT * FROM meal_templates WHERE id = ?",
            (meal_template_id,),
        ).fetchone()
        if row is None:
            return None
        return self._row_to_meal_template(row)

    def save_recipe(self, recipe: RecipeDefinition) -> RecipeDefinition:
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO recipes (id, title, default_yield, favorite)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    default_yield = excluded.default_yield,
                    favorite = excluded.favorite
                """,
                (recipe.id, recipe.title, recipe.default_yield, 1 if recipe.favorite else 0),
            )
            self._connection.execute("DELETE FROM recipe_steps WHERE recipe_id = ?", (recipe.id,))
            self._connection.execute("DELETE FROM recipe_assets WHERE recipe_id = ?", (recipe.id,))
            self._connection.execute(
                "DELETE FROM recipe_ingredients WHERE recipe_id = ?",
                (recipe.id,),
            )
            self._connection.executemany(
                """
                INSERT INTO recipe_steps (recipe_id, position, step_text)
                VALUES (?, ?, ?)
                """,
                [(recipe.id, index, step) for index, step in enumerate(recipe.steps, start=1)],
            )
            self._connection.executemany(
                """
                INSERT INTO recipe_assets (recipe_id, kind, url, content)
                VALUES (?, ?, ?, ?)
                """,
                [
                    (recipe.id, asset.kind, asset.url, asset.content)
                    for asset in recipe.assets
                ],
            )
            self._connection.executemany(
                """
                INSERT INTO recipe_ingredients (
                    recipe_id, food_id, name, grams, calories_per_100g,
                    protein_per_100g, carbs_per_100g, fat_per_100g
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        recipe.id,
                        ingredient.food_id,
                        ingredient.name,
                        ingredient.grams,
                        ingredient.calories_per_100g,
                        ingredient.macros_per_100g.protein,
                        ingredient.macros_per_100g.carbs,
                        ingredient.macros_per_100g.fat,
                    )
                    for ingredient in recipe.ingredients
                ],
            )
        return recipe

    @_synchronized
    def _row_to_recipe(self, row: sqlite3.Row) -> RecipeDefinition:
        step_rows = self._connection.execute(
            "SELECT step_text FROM recipe_steps WHERE recipe_id = ? ORDER BY position",
            (row["id"],),
        ).fetchall()
        asset_rows = self._connection.execute(
            "SELECT kind, url, content FROM recipe_assets WHERE recipe_id = ? ORDER BY id",
            (row["id"],),
        ).fetchall()
        ingredient_rows = self._connection.execute(
            "SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY id",
            (row["id"],),
        ).fetchall()
        return RecipeDefinition(
            id=row["id"],
            title=row["title"],
            steps=[step_row["step_text"] for step_row in step_rows],
            assets=[
                RecipeAsset(kind=asset_row["kind"], url=asset_row["url"], content=asset_row["content"])
                for asset_row in asset_rows
            ],
            ingredients=[
                {
                    "id": f"{row['id']}-{ingredient_row['id']}",
                    "food_id": ingredient_row["food_id"],
                    "name": ingredient_row["name"],
                    "grams": ingredient_row["grams"],
                    "calories_per_100g": ingredient_row["calories_per_100g"],
                    "macros_per_100g": {
                        "protein": ingredient_row["protein_per_100g"],
                        "carbs": ingredient_row["carbs_per_100g"],
                        "fat": ingredient_row["fat_per_100g"],
                    },
                }
                for ingredient_row in ingredient_rows
            ],
            default_yield=row["default_yield"],
            favorite=bool(row["favorite"]),
        )

    @_synchronized
    def list_recipes(self) -> list[RecipeDefinition]:
        rows = self._connection.execute("SELECT * FROM recipes ORDER BY title").fetchall()
        return [self._row_to_recipe(row) for row in rows]

    @_synchronized
    def get_recipe(self, recipe_id: str) -> RecipeDefinition | None:
        row = self._connection.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_recipe(row)
