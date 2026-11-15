"""Garmin personal API sync. Every call goes through httpx.MockTransport; nothing leaves."""

from datetime import date

import httpx
import pytest

from backend.app.integrations import garmin
from backend.app.integrations.garmin import GarminError, to_imported_workout
from backend.app.services.garmin_sync import sync_garmin
from tests.conftest import isolated_test_settings

KEY = "test-garmin-key"

RIDE = {
    "activityId": 22001,
    "activityName": "Indoor Cycling",
    "activityType": {"typeKey": "indoor_cycling", "typeId": 25},
    "startTimeLocal": "2026-11-15 18:05:00",
    "startTimeGMT": "2026-11-16 00:05:00",
    "duration": 3600.0,
    "distance": 0.0,
    "calories": 700.0,
    "bmrCalories": 95.0,
}


@pytest.fixture(autouse=True)
def _fresh_tokens():
    garmin.clear_token_cache()
    yield
    garmin.clear_token_cache()


def _settings(**extra):
    settings = isolated_test_settings()
    return settings.model_copy(update={"garmin_personal_api_key": KEY, **extra})


def _handler(activities, calls, token_status=200):
    def handle(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.path.endswith("/token"):
            assert request.headers["Authorization"] == f"ApiKey {KEY}"
            return httpx.Response(token_status, text="jwt-token")
        assert request.headers["Authorization"] == "Bearer jwt-token"
        start = int(request.url.params["start"])
        return httpx.Response(200, json=activities[start : start + garmin.PAGE_SIZE])

    return lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle))


def test_normalises_an_activity():
    workout = to_imported_workout(RIDE)
    assert workout.source_id == "22001"
    assert workout.started_local.isoformat() == "2026-11-15T18:05:00"
    assert workout.started_at_utc == "2026-11-16T00:05:00Z"
    assert workout.distance_m is None  # indoor: no distance
    assert (workout.calories_total, workout.bmr_calories) == (700, 95)
    assert to_imported_workout({**RIDE, "duration": 0}) is None
    assert to_imported_workout({**RIDE, "startTimeLocal": None}) is None
    unnamed = to_imported_workout({**RIDE, "activityName": ""})
    assert unnamed.title == "Indoor cycling"


@pytest.mark.asyncio
async def test_sync_imports_once_and_reports_status(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")
    calls = []
    factory = _handler([RIDE], calls)
    first = await sync_garmin(repository, _settings(), "u1", client_factory=factory, today=date(2026, 11, 16))
    assert first["imported"] == 1 and first["last_status"] == "ok"
    activity_call = calls[1]
    assert activity_call.url.params["startDate"] == "2026-10-17"  # 30 days back on first sync
    assert activity_call.url.params["endDate"] == "2026-11-17"

    again = await sync_garmin(repository, _settings(), "u1", client_factory=factory, today=date(2026, 11, 16))
    assert again["imported"] == 0
    assert len(repository.list_exercise_entries("u1")) == 1
    assert sum(call.url.path.endswith("/token") for call in calls) == 1  # token reused
    assert calls[-1].url.params["startDate"] < "2026-11-16"  # overlap re-reads late uploads


@pytest.mark.asyncio
async def test_paging_reads_every_page(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")
    many = [{**RIDE, "activityId": 30000 + index} for index in range(garmin.PAGE_SIZE + 3)]
    calls = []
    result = await sync_garmin(repository, _settings(), "u1", client_factory=_handler(many, calls))
    assert result["imported"] == garmin.PAGE_SIZE + 3


@pytest.mark.asyncio
async def test_a_rejected_key_is_recorded_without_the_key(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")
    with pytest.raises(GarminError):
        await sync_garmin(repository, _settings(), "u1", client_factory=_handler([], [], token_status=401))
    state = repository.get_sync_state(user_id="u1", source="garmin")
    assert state["last_status"] == "error"
    assert KEY not in state["last_error"] and "didn't accept" in state["last_error"]
    assert state["last_success_at"] is None


@pytest.mark.asyncio
async def test_routes_need_a_key(client, auth_headers):
    status = await client.get("/api/integrations/garmin", headers=auth_headers)
    assert status.status_code == 200 and status.json()["configured"] is False
    sync = await client.post("/api/integrations/garmin/sync", headers=auth_headers)
    assert sync.status_code == 409


@pytest.mark.asyncio
async def test_routes_require_a_session(client):
    assert (await client.get("/api/integrations/garmin")).status_code == 401


@pytest.mark.asyncio
async def test_a_malformed_activity_is_skipped_not_fatal(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")
    bad = {**RIDE, "activityId": 999, "activityType": "cycling"}
    weird = {**RIDE, "activityId": 998, "duration": "n/a"}
    result = await sync_garmin(repository, _settings(), "u1", client_factory=_handler([bad, weird, RIDE], []))
    assert result["imported"] == 2 and result["skipped"] == 1


@pytest.mark.asyncio
async def test_a_non_json_reply_is_recorded_as_an_error(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")

    def handle(request):
        if request.url.path.endswith("/token"):
            return httpx.Response(200, text="jwt-token")
        return httpx.Response(200, text="<html>maintenance</html>")

    with pytest.raises(GarminError):
        await sync_garmin(
            repository, _settings(), "u1", client_factory=lambda: httpx.AsyncClient(transport=httpx.MockTransport(handle))
        )
    assert repository.get_sync_state(user_id="u1", source="garmin")["last_status"] == "error"
