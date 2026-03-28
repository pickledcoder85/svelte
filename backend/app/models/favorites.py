from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class SavedFavorite(BaseModel):
    id: str
    user_id: str
    entity_type: Literal["recipe", "meal_template", "food"]
    entity_id: str
    created_at: datetime | None = None
