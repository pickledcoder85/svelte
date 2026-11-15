"""Removing one planned meal when plans change."""

import pytest


def _slot(label, title, calories):
    return {"meal_label": label, "title": title, "calories": calories, "prep_status": "Flexible", "items": []}


@pytest.mark.asyncio
async def test_removing_a_planned_meal_keeps_what_was_eaten(client, auth_headers):
    day = (
        await client.post(
            "/api/tracker/meal-plan",
            headers=auth_headers,
            json={
                "plan_date": "2026-11-15",
                "label": "Sunday",
                "focus": "Easy",
                "slots": [_slot("Breakfast", "Yogurt", 316), _slot("Lunch", "Bowl", 610)],
            },
        )
    ).json()
    breakfast, lunch = day["slots"]
    eaten = await client.patch(
        f"/api/tracker/meal-plan/slots/{breakfast['id']}", headers=auth_headers, json={"eaten_at": "2026-11-15T08:00:00"}
    )
    assert eaten.status_code == 200

    removed = await client.delete(f"/api/tracker/meal-plan/slots/{breakfast['id']}", headers=auth_headers)
    assert removed.status_code == 200
    assert [slot["id"] for slot in removed.json()["slots"]] == [lunch["id"]]

    logs = (await client.get("/api/nutrition/logs", headers=auth_headers)).json()
    entries = logs[0]["entries"]
    assert len(entries) == 1 and entries[0]["calories"] == 316  # the eaten meal stays logged
    assert entries[0]["meal_plan_slot_id"] is None

    again = await client.delete(f"/api/tracker/meal-plan/slots/{breakfast['id']}", headers=auth_headers)
    assert again.status_code == 404


@pytest.mark.asyncio
async def test_cannot_remove_someone_elses_planned_meal(client, auth_headers):
    day = (
        await client.post(
            "/api/tracker/meal-plan",
            headers=auth_headers,
            json={"plan_date": "2026-11-15", "label": "Sunday", "focus": "Easy", "slots": [_slot("Lunch", "Bowl", 610)]},
        )
    ).json()
    other = await client.post("/api/auth/session", json={"email": "other@example.com", "display_name": "Other"})
    other_headers = {"Authorization": f"Bearer {other.json()['session']['access_token']}"}
    response = await client.delete(f"/api/tracker/meal-plan/slots/{day['slots'][0]['id']}", headers=other_headers)
    assert response.status_code in (403, 404)
