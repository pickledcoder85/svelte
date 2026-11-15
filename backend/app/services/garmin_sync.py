"""Pulling the owner's Garmin activities into Relish.

Runs every 30 minutes in the background, and on demand (Settings → Sync now, or when the app
opens and the last sync is stale). Each activity is saved once; see workout_import.
"""
from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from backend.app.config import Settings
from backend.app.integrations.garmin import GarminError, fetch_activities, to_imported_workout
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.workout_import import save_imported_workout

SOURCE = "garmin"
FIRST_SYNC_DAYS = 30
# Re-read two weeks before the last good sync: a watch can upload days late (a trip without
# the phone). Already-imported activities are cheap no-ops.
OVERLAP_DAYS = 14
BACKGROUND_INTERVAL_SECONDS = 30 * 60

logger = logging.getLogger(__name__)
_sync_lock = asyncio.Lock()


def garmin_configured(settings: Settings) -> bool:
    return bool(settings.garmin_personal_api_key.strip())


def garmin_status(repository: SQLiteRepository, settings: Settings, user_id: str) -> dict[str, Any]:
    state = repository.get_sync_state(user_id=user_id, source=SOURCE) or {}
    return {
        "configured": garmin_configured(settings),
        "last_attempt_at": state.get("last_attempt_at"),
        "last_success_at": state.get("last_success_at"),
        "last_status": state.get("last_status"),
        "last_error": state.get("last_error"),
        "last_imported": state.get("last_imported", 0),
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _window(state: dict[str, Any] | None, today: date) -> tuple[date, date]:
    last = (state or {}).get("last_success_at")
    if last:
        start = datetime.fromisoformat(last.replace("Z", "+00:00")).date() - timedelta(days=OVERLAP_DAYS)
    else:
        start = today - timedelta(days=FIRST_SYNC_DAYS)
    return start, today + timedelta(days=1)


async def sync_garmin(
    repository: SQLiteRepository,
    settings: Settings,
    user_id: str,
    *,
    client_factory: Callable[[], httpx.AsyncClient] | None = None,
    today: date | None = None,
) -> dict[str, Any]:
    """Import new Garmin activities. Returns the status plus counts for this run."""
    if not garmin_configured(settings):
        raise GarminError("Garmin isn't connected.")
    async with _sync_lock:
        state = repository.get_sync_state(user_id=user_id, source=SOURCE)
        start, end = _window(state, today or date.today())
        created = skipped = matched = 0
        try:
            async with (client_factory or httpx.AsyncClient)() as client:
                activities = await fetch_activities(client, settings.garmin_personal_api_key.strip(), start, end)
            for activity in activities:
                try:
                    workout = to_imported_workout(activity)
                except (TypeError, ValueError, AttributeError):
                    workout = None
                if workout is None:
                    skipped += 1
                    continue
                outcome, _ = save_imported_workout(repository, user_id, workout)
                created += outcome == "created"
                matched += outcome == "matched"
        except GarminError as error:
            repository.record_sync_result(user_id=user_id, source=SOURCE, at=_now(), ok=False, error=str(error))
            raise
        except Exception:
            repository.record_sync_result(
                user_id=user_id, source=SOURCE, at=_now(), ok=False, error="Unexpected problem syncing Garmin."
            )
            raise
        repository.record_sync_result(user_id=user_id, source=SOURCE, at=_now(), ok=True, imported=created)
    return {**garmin_status(repository, settings, user_id), "imported": created, "matched": matched, "skipped": skipped}


async def run_background_sync(repository: SQLiteRepository, settings: Settings) -> None:
    """Sync the owner's Garmin every 30 minutes for as long as the app runs."""
    while True:
        try:
            owner = repository.get_user_identity_by_email(settings.owner_email)
            if owner is not None:
                await sync_garmin(repository, settings, owner["user_id"])
        except GarminError as error:
            logger.warning("Garmin sync failed: %s", error)
        except Exception:  # keep the loop alive; never log request details
            logger.exception("Garmin sync crashed")
        await asyncio.sleep(BACKGROUND_INTERVAL_SECONDS)
