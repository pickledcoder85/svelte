import pytest


def _install_food_favorite_store(repository, monkeypatch):
    store: dict[str, dict[str, dict[str, str]]] = {}

    def save_favorite(*, user_id: str, entity_type: str, entity_id: str, favorite_id: str | None = None):
        assert entity_type == "food"
        user_store = store.setdefault(user_id, {})
        favorite = {
            "id": favorite_id or f"favorite-{user_id}-{entity_id}",
            "user_id": user_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
        }
        user_store[entity_id] = favorite
        return favorite

    def get_saved_favorite(user_id: str, entity_type: str, entity_id: str):
        if entity_type != "food":
            return None
        return store.get(user_id, {}).get(entity_id)

    def list_saved_favorites(user_id: str, entity_type: str | None = None):
        if entity_type not in (None, "food"):
            return []
        return list(store.get(user_id, {}).values())

    def remove_favorite(*, user_id: str, entity_type: str, entity_id: str):
        assert entity_type == "food"
        store.get(user_id, {}).pop(entity_id, None)

    monkeypatch.setattr(repository, "save_favorite", save_favorite)
    monkeypatch.setattr(repository, "get_saved_favorite", get_saved_favorite)
    monkeypatch.setattr(repository, "list_saved_favorites", list_saved_favorites)
    monkeypatch.setattr(repository, "remove_favorite", remove_favorite)
    return store


@pytest.mark.asyncio
async def test_food_search_and_favorite_food_flow(client, repository, monkeypatch):
    session_response = await client.post(
        "/api/auth/session",
        json={"email": "food-favorites@example.com", "display_name": "Food Favorites"},
    )
    assert session_response.status_code == 200
    session = session_response.json()["session"]
    headers = {"Authorization": f"Bearer {session['access_token']}"}

    _install_food_favorite_store(repository, monkeypatch)

    search_response = await client.get("/api/nutrition/foods/search?q=oats")
    assert search_response.status_code == 200
    foods = search_response.json()
    assert foods
    assert foods[0]["id"] == "food-oats"
    assert foods[0]["favorite"] is False

    favorite_response = await client.post(
        "/api/nutrition/favorites/foods/food-oats",
        headers=headers,
    )
    assert favorite_response.status_code == 200
    assert favorite_response.json() == {"food_id": "food-oats", "favorite": True}

    favorites_response = await client.get(
        "/api/nutrition/favorites/foods",
        headers=headers,
    )
    assert favorites_response.status_code == 200
    favorites = favorites_response.json()
    assert len(favorites) == 1
    assert favorites[0]["id"] == "food-oats"
    assert favorites[0]["favorite"] is True

    search_response = await client.get(
        "/api/nutrition/foods/search?q=oats",
        headers=headers,
    )
    assert search_response.status_code == 200
    foods = search_response.json()
    assert foods[0]["favorite"] is True

    remove_response = await client.delete(
        "/api/nutrition/favorites/foods/food-oats",
        headers=headers,
    )
    assert remove_response.status_code == 200
    assert remove_response.json() == {"food_id": "food-oats", "favorite": False}

    repeat_remove = await client.delete(
        "/api/nutrition/favorites/foods/food-oats",
        headers=headers,
    )
    assert repeat_remove.status_code == 200
    assert repeat_remove.json() == {"food_id": "food-oats", "favorite": False}

    favorites_response = await client.get(
        "/api/nutrition/favorites/foods",
        headers=headers,
    )
    assert favorites_response.status_code == 200
    assert favorites_response.json() == []
