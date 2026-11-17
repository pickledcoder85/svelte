"""SQLite repository, split by domain into mixins composed here."""

from __future__ import annotations

from ._base import SQLiteRepositoryBase, _synchronized
from ._constants import DEFAULT_FAVORITE_FOOD_IDS, DEFAULT_FOOD_CATALOG_SEEDS, ExerciseLinkedToPlanError
from .users import UsersMixin
from .goals import GoalsMixin
from .foods import FoodsMixin
from .food_logs import FoodLogsMixin
from .meal_plans import MealPlansMixin
from .recipes import RecipesMixin
from .exercise import ExerciseMixin
from .integrations import IntegrationsMixin
from .ingestion import IngestionMixin
from .water import WaterMixin
from .notifications import NotificationsMixin
from .shopping import ShoppingMixin

__all__ = [
    "DEFAULT_FAVORITE_FOOD_IDS",
    "DEFAULT_FOOD_CATALOG_SEEDS",
    "ExerciseLinkedToPlanError",
    "SQLiteRepository",
    "SQLiteRepositoryBase",
    "_synchronized",
]


class SQLiteRepository(
    UsersMixin,
    GoalsMixin,
    FoodsMixin,
    FoodLogsMixin,
    MealPlansMixin,
    RecipesMixin,
    ExerciseMixin,
    IntegrationsMixin,
    IngestionMixin,
    WaterMixin,
    NotificationsMixin,
    ShoppingMixin,
    SQLiteRepositoryBase,
):
    """The app's single SQLite repository; each mixin owns one domain's tables."""
