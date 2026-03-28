from __future__ import annotations

from dataclasses import dataclass, field

from backend.app.models.auth import AuthSession
from backend.app.models.meals import MealTemplate
from backend.app.models.nutrition import FoodItem, MacroTargets, WeeklyMetrics
from backend.app.models.recipes import RecipeDefinition


@dataclass
class InMemoryBackendRepository:
    foods: list[FoodItem] = field(default_factory=list)
    weekly_metrics: WeeklyMetrics | None = None
    sessions: dict[str, AuthSession] = field(default_factory=dict)
    recipes: dict[str, RecipeDefinition] = field(default_factory=dict)
    meal_templates: dict[str, MealTemplate] = field(default_factory=dict)

    @classmethod
    def seeded(cls) -> "InMemoryBackendRepository":
        return cls(
            foods=[
                FoodItem(
                    id="food-oats",
                    name="Rolled oats",
                    calories=389,
                    serving_size=100,
                    serving_unit="g",
                    macros=MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
                    source="CUSTOM",
                ),
                FoodItem(
                    id="food-greek-yogurt",
                    name="Greek yogurt, plain nonfat",
                    calories=59,
                    serving_size=100,
                    serving_unit="g",
                    macros=MacroTargets(protein=10.3, carbs=3.6, fat=0.4),
                    source="CUSTOM",
                ),
                FoodItem(
                    id="food-blueberries",
                    name="Blueberries",
                    calories=57,
                    serving_size=100,
                    serving_unit="g",
                    macros=MacroTargets(protein=0.7, carbs=14.5, fat=0.3),
                    source="CUSTOM",
                ),
            ],
            weekly_metrics=WeeklyMetrics(
                calorie_goal=14800,
                calories_consumed=10360,
                macro_targets=MacroTargets(protein=980, carbs=1260, fat=420),
                macro_consumed=MacroTargets(protein=742, carbs=901, fat=308),
                weekly_weight_change=-1.2,
                adherence_score=87,
            ),
        )

    def list_foods(self) -> list[FoodItem]:
        return list(self.foods)

    def search_foods(self, query: str) -> list[FoodItem]:
        normalized = query.strip().lower()
        if not normalized:
            return self.list_foods()
        return [
            food
            for food in self.foods
            if normalized in food.name.lower() or (food.brand and normalized in food.brand.lower())
        ]

    def get_weekly_metrics(self) -> WeeklyMetrics:
        if self.weekly_metrics is None:
            self.weekly_metrics = WeeklyMetrics(
                calorie_goal=0,
                calories_consumed=0,
                macro_targets=MacroTargets(protein=0, carbs=0, fat=0),
                macro_consumed=MacroTargets(protein=0, carbs=0, fat=0),
                weekly_weight_change=0.0,
                adherence_score=0,
            )
        return self.weekly_metrics

    def save_session(self, session: AuthSession) -> AuthSession:
        self.sessions[session.access_token] = session
        return session

    def get_session(self, access_token: str) -> AuthSession | None:
        return self.sessions.get(access_token)

    def save_recipe(self, recipe: RecipeDefinition) -> RecipeDefinition:
        self.recipes[recipe.id] = recipe
        return recipe

    def list_recipes(self) -> list[RecipeDefinition]:
        return list(self.recipes.values())

    def get_recipe(self, recipe_id: str) -> RecipeDefinition | None:
        return self.recipes.get(recipe_id)

    def save_meal_template(self, meal_template: MealTemplate) -> MealTemplate:
        self.meal_templates[meal_template.id] = meal_template
        return meal_template

    def list_meal_templates(self) -> list[MealTemplate]:
        return list(self.meal_templates.values())

    def get_meal_template(self, meal_template_id: str) -> MealTemplate | None:
        return self.meal_templates.get(meal_template_id)


_demo_repository = InMemoryBackendRepository.seeded()


def get_demo_repository() -> InMemoryBackendRepository:
    return _demo_repository
