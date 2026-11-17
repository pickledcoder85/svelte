"""Water: drinks logged by day, the daily goal, and owner-only access."""

import pytest


async def _profile(client, headers):
    return (await client.get("/api/profile", headers=headers)).json()


@pytest.mark.asyncio
async def test_log_list_and_undo_water(client, auth_headers):
    first = await client.post("/api/water", headers=auth_headers, json={"logged_on": "2026-11-17", "amount_ml": 250})
    assert first.status_code == 200 and first.json()["amount_ml"] == 250
    await client.post("/api/water", headers=auth_headers, json={"logged_on": "2026-11-17", "amount_ml": 500})
    await client.post("/api/water", headers=auth_headers, json={"logged_on": "2026-11-10", "amount_ml": 250})

    week = (await client.get("/api/water", headers=auth_headers, params={"start": "2026-11-11", "end": "2026-11-17"})).json()
    assert [entry["amount_ml"] for entry in week] == [250, 500]

    gone = await client.delete(f"/api/water/{first.json()['id']}", headers=auth_headers)
    assert gone.status_code == 204
    assert (await client.delete(f"/api/water/{first.json()['id']}", headers=auth_headers)).status_code == 404
    week = (await client.get("/api/water", headers=auth_headers, params={"start": "2026-11-11", "end": "2026-11-17"})).json()
    assert [entry["amount_ml"] for entry in week] == [500]


@pytest.mark.asyncio
async def test_bad_amounts_and_ranges_are_refused(client, auth_headers):
    assert (await client.post("/api/water", headers=auth_headers, json={"logged_on": "2026-11-17", "amount_ml": 0})).status_code == 422
    assert (await client.post("/api/water", headers=auth_headers, json={"logged_on": "2026-11-17", "amount_ml": 5000})).status_code == 422
    backwards = await client.get("/api/water", headers=auth_headers, params={"start": "2026-11-17", "end": "2026-11-01"})
    assert backwards.status_code == 400


@pytest.mark.asyncio
async def test_water_goal_defaults_to_two_litres_and_can_change(client, auth_headers):
    profile = await _profile(client, auth_headers)
    assert profile["water_goal_ml"] == 2000
    updated = await client.put("/api/profile", headers=auth_headers, json={
        "display_name": profile.get("display_name"), "timezone": profile["timezone"], "units": profile["units"], "water_goal_ml": 2500})
    assert updated.status_code == 200 and updated.json()["water_goal_ml"] == 2500
    too_much = await client.put("/api/profile", headers=auth_headers, json={
        "display_name": None, "timezone": profile["timezone"], "units": profile["units"], "water_goal_ml": 50000})
    assert too_much.status_code == 422


def test_one_users_water_is_not_anothers(repository):
    from datetime import date

    repository.ensure_user_identity(user_id="a", email="a@example.com")
    repository.ensure_user_identity(user_id="b", email="b@example.com")
    entry = repository.add_water_entry(user_id="a", logged_on=date(2026, 11, 17), amount_ml=250)
    assert repository.delete_water_entry(user_id="b", entry_id=entry["id"]) is False
    assert repository.list_water_entries("b", date(2026, 11, 1), date(2026, 11, 30)) == []
