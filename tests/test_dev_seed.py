from pathlib import Path

from backend.app.db.database import apply_migrations
from backend.app.db.dev_seed import DEV_USER_EMAIL, seed_dev_data
from backend.app.repositories.sqlite import SQLiteRepository


def test_seed_dev_data_includes_demo_recipes(tmp_path: Path) -> None:
    database_path = tmp_path / "seeded.db"
    database_url = f"sqlite:///{database_path}"

    apply_migrations(database_url)
    result = seed_dev_data(database_url)

    repo = SQLiteRepository(str(database_path))
    recipes = repo.list_recipes()
    user = repo.get_user_identity_by_email(DEV_USER_EMAIL)

    assert result["database_path"] == str(database_path)
    assert len(recipes) == 3
    assert {recipe.title for recipe in recipes} == {
        "Citrus Chicken Bowl",
        "Overnight Oats Base",
        "Summer Berry Parfait",
    }
    assert user is not None
    favorite_payloads = repo.list_saved_favorites(user["user_id"], "recipe")
    assert {payload["entity_id"] for payload in favorite_payloads} == {
        "recipe-overnight-oats",
        "recipe-summer-parfait",
    }
