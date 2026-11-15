"""Garmin Connect personal API (pull only, the owner's own data).

The personal API key (GARMIN_PERSONAL_API_KEY) is exchanged for a bearer token that lasts about
24 hours; activities are then read with that token. The key and token are never logged, stored
in the database, or returned to the app.
"""
from __future__ import annotations

import time
from datetime import date, datetime, timezone
from typing import Any

import httpx

from backend.app.services.workout_import import ImportedWorkout

GARMIN_BASE_URL = "https://personal.connectapi.garmin.com"
TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token"
ACTIVITIES_PATH = "/activitylist-service/activities/search/activities"
PAGE_SIZE = 50
MAX_PAGES = 10
# Tokens last about 24 hours; renew well before that.
TOKEN_LIFETIME_SECONDS = 20 * 3600


class GarminError(RuntimeError):
    """A failure safe to show the user: never includes the key or token."""


_token_cache: dict[str, tuple[str, float]] = {}


def clear_token_cache() -> None:
    _token_cache.clear()


async def _token(client: httpx.AsyncClient, api_key: str) -> str:
    cached = _token_cache.get(api_key)
    if cached and cached[1] > time.monotonic():
        return cached[0]
    try:
        response = await client.post(
            GARMIN_BASE_URL + TOKEN_PATH, headers={"Authorization": f"ApiKey {api_key}"}, timeout=20.0
        )
    except httpx.RequestError as exc:
        raise GarminError("Couldn't reach Garmin.") from exc
    if response.status_code in (401, 403):
        raise GarminError("Garmin didn't accept the API key.")
    if not response.is_success:
        raise GarminError(f"Garmin sign-in failed ({response.status_code}).")
    token = response.text.strip().strip('"')
    if not token:
        raise GarminError("Garmin sign-in returned no token.")
    _token_cache[api_key] = (token, time.monotonic() + TOKEN_LIFETIME_SECONDS)
    return token


async def fetch_activities(
    client: httpx.AsyncClient, api_key: str, start: date, end: date
) -> list[dict[str, Any]]:
    """Activities that started between two days (inclusive), newest first."""
    token = await _token(client, api_key)
    activities: list[dict[str, Any]] = []
    for page in range(MAX_PAGES):
        try:
            response = await client.get(
                GARMIN_BASE_URL + ACTIVITIES_PATH,
                params={
                    "start": page * PAGE_SIZE,
                    "limit": PAGE_SIZE,
                    "startDate": start.isoformat(),
                    "endDate": end.isoformat(),
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=20.0,
            )
        except httpx.RequestError as exc:
            raise GarminError("Couldn't reach Garmin.") from exc
        if response.status_code in (401, 403):
            _token_cache.pop(api_key, None)
            raise GarminError("Garmin sign-in expired; try again.")
        if not response.is_success:
            raise GarminError(f"Garmin activities failed ({response.status_code}).")
        batch = response.json()
        if not isinstance(batch, list):
            raise GarminError("Garmin returned an unexpected response.")
        activities.extend(item for item in batch if isinstance(item, dict))
        if len(batch) < PAGE_SIZE:
            break
    return activities


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number else None  # drop NaN


def _parse_local(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("T", " ").split(".")[0])
    except ValueError:
        return None


def _type_label(type_key: str | None) -> str:
    return (type_key or "workout").replace("_", " ").strip().capitalize() or "Workout"


def to_imported_workout(activity: dict[str, Any]) -> ImportedWorkout | None:
    """One Garmin activity in Relish's import shape; None when it can't be counted."""
    activity_id = activity.get("activityId")
    started_local = _parse_local(activity.get("startTimeLocal"))
    duration = _number(activity.get("duration")) or _number(activity.get("elapsedDuration"))
    if activity_id is None or started_local is None or not duration or duration <= 0:
        return None
    type_key = (activity.get("activityType") or {}).get("typeKey")
    started_gmt = _parse_local(activity.get("startTimeGMT"))
    distance = _number(activity.get("distance"))
    name = str(activity.get("activityName") or "").strip()
    return ImportedWorkout(
        source="garmin",
        source_id=str(activity_id),
        title=name or _type_label(type_key),
        activity_type=type_key,
        started_local=started_local,
        started_at_utc=(
            started_gmt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z") if started_gmt else None
        ),
        duration_seconds=duration,
        distance_m=distance if distance and distance > 0 else None,
        calories_total=_number(activity.get("calories")),
        bmr_calories=_number(activity.get("bmrCalories")),
        raw=activity,
    )
