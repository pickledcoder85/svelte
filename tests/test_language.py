"""Language: the profile's display language defaults to English and can switch to Spanish."""

import pytest


async def _profile(client, headers):
    return (await client.get("/api/profile", headers=headers)).json()


def _update(profile, **changes):
    return {"display_name": profile.get("display_name"), "timezone": profile["timezone"], "units": profile["units"], **changes}


@pytest.mark.asyncio
async def test_language_defaults_to_english(client, auth_headers):
    assert (await _profile(client, auth_headers))["language"] == "en"


@pytest.mark.asyncio
async def test_language_can_change_and_is_kept_when_omitted(client, auth_headers):
    profile = await _profile(client, auth_headers)
    updated = await client.put("/api/profile", headers=auth_headers, json=_update(profile, language="es"))
    assert updated.status_code == 200 and updated.json()["language"] == "es"
    assert (await _profile(client, auth_headers))["language"] == "es"
    # Saving other settings leaves the language alone.
    again = await client.put("/api/profile", headers=auth_headers, json=_update(profile, water_goal_ml=2500))
    assert again.status_code == 200 and again.json()["language"] == "es"
    back = await client.put("/api/profile", headers=auth_headers, json=_update(profile, language="en"))
    assert back.json()["language"] == "en"


@pytest.mark.asyncio
async def test_unknown_language_is_refused(client, auth_headers):
    profile = await _profile(client, auth_headers)
    refused = await client.put("/api/profile", headers=auth_headers, json=_update(profile, language="fr"))
    assert refused.status_code == 422


@pytest.mark.asyncio
async def test_language_counts_as_chosen_only_once_picked(client, auth_headers):
    profile = await _profile(client, auth_headers)
    assert profile["language_chosen"] is False  # the app follows the phone
    await client.put("/api/profile", headers=auth_headers, json=_update(profile, water_goal_ml=2500))
    assert (await _profile(client, auth_headers))["language_chosen"] is False  # other settings don't count
    chosen = await client.put("/api/profile", headers=auth_headers, json=_update(profile, language="en"))
    assert chosen.json()["language_chosen"] is True  # picking English is a choice too
