"""Shopping lists: saved from a plan, ticked off, items added, deleted; owner-only."""

import pytest

ITEMS = [
    {"name": "Eggs", "amount": "12 large eggs (600 g)", "role": "protein"},
    {"name": "Oats", "amount": "300 g", "role": "carb"},
    {"name": "Spinach", "amount": "180 g", "role": "veg"},
]


@pytest.mark.asyncio
async def test_create_tick_add_and_delete(client, auth_headers):
    created = await client.post("/api/shopping-lists", headers=auth_headers, json={"title": "Meal plan · Nov 18–20", "items": ITEMS})
    assert created.status_code == 200
    shopping = created.json()
    assert [item["name"] for item in shopping["items"]] == ["Eggs", "Oats", "Spinach"]
    assert not any(item["checked"] for item in shopping["items"])

    eggs = shopping["items"][0]["id"]
    ticked = (await client.patch(f"/api/shopping-lists/{shopping['id']}/items/{eggs}", headers=auth_headers, json={"checked": True})).json()
    assert ticked["items"][0]["checked"] is True

    added = (await client.post(f"/api/shopping-lists/{shopping['id']}/items", headers=auth_headers, json={"name": "Coffee"})).json()
    assert added["items"][-1]["name"] == "Coffee" and added["items"][-1]["role"] == "other" and added["items"][-1]["position"] == 3

    summaries = (await client.get("/api/shopping-lists", headers=auth_headers)).json()
    assert summaries[0]["title"] == "Meal plan · Nov 18–20" and summaries[0]["total"] == 4 and summaries[0]["remaining"] == 3

    gone = await client.delete(f"/api/shopping-lists/{shopping['id']}", headers=auth_headers)
    assert gone.status_code == 204
    assert (await client.get(f"/api/shopping-lists/{shopping['id']}", headers=auth_headers)).status_code == 404
    assert (await client.get("/api/shopping-lists", headers=auth_headers)).json() == []


@pytest.mark.asyncio
async def test_bad_input_is_refused(client, auth_headers):
    assert (await client.post("/api/shopping-lists", headers=auth_headers, json={"title": "", "items": []})).status_code == 422
    assert (await client.post("/api/shopping-lists", headers=auth_headers, json={"title": "x", "items": [{"name": "a", "role": "candy"}]})).status_code == 422
    assert (await client.patch("/api/shopping-lists/nope/items/nope", headers=auth_headers, json={"checked": True})).status_code == 404


def test_lists_are_owner_only(repository):
    repository.ensure_user_identity(user_id="a", email="a@example.com")
    repository.ensure_user_identity(user_id="b", email="b@example.com")
    list_id = repository.create_shopping_list(user_id="a", title="Mine", items=ITEMS)
    item_id = repository.get_shopping_list("a", list_id)["items"][0]["id"]
    assert repository.get_shopping_list("b", list_id) is None
    assert repository.set_shopping_item_checked(user_id="b", list_id=list_id, item_id=item_id, checked=True) is False
    assert repository.add_shopping_item(user_id="b", list_id=list_id, name="x", amount="", role="other") is False
    assert repository.delete_shopping_list(user_id="b", list_id=list_id) is False
    assert repository.get_shopping_list("a", list_id)["items"][0]["checked"] is False
