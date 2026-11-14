import pytest

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


@pytest.mark.asyncio
async def test_seeded_dev_user_can_load_profile_and_goals(tmp_path: Path) -> None:
    """Regression: dev_seed once wrote target_source='generated_onboarding', which made
    GET /api/profile fail with a 500 for the seeded user."""
    import httpx

    from backend.app.main import create_app
    from tests.conftest import isolated_test_settings

    database_path = tmp_path / "seeded-api.db"
    result = seed_dev_data(f"sqlite:///{database_path}")
    app = create_app(database_path=str(database_path), settings=isolated_test_settings())
    headers = {"Authorization": f"Bearer {result['access_token']}"}
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        profile = await client.get("/api/profile", headers=headers)
        goals = await client.get("/api/profile/goals", headers=headers)

    assert profile.status_code == 200
    assert profile.json()["target_source"] == "system_default"
    assert goals.status_code == 200
    assert goals.json()[0]["target_source"] == "system_default"
