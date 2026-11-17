"""Water reminders at the times the user chose, in their time zone.

A loop checks every minute. A reminder is due once a day, from its time until 30 minutes after
(a restart or a slow minute doesn't lose it; a server that was down all afternoon doesn't send
stale reminders). When the day's water goal is already met, it's skipped (and counted as sent).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, time, timedelta, timezone
from collections.abc import Callable
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from backend.app.config import Settings
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.push import Subscription, send_push

logger = logging.getLogger(__name__)
CHECK_SECONDS = 60
WINDOW = timedelta(minutes=30)
GLASS_ML = 250
REMINDER_KINDS = ("water",)


def reminders_configured(settings: Settings) -> bool:
    return bool(settings.vapid_private_key.strip() and settings.vapid_public_key.strip())


def user_zone(name: str | None) -> ZoneInfo | timezone:
    try:
        return ZoneInfo(name or "UTC")
    except (ZoneInfoNotFoundError, ValueError):
        return timezone.utc


def is_due(local_time: str, last_sent_on: str | None, now_local: datetime) -> bool:
    """Due from its time until 30 minutes after, once per local day."""
    hours, minutes = (int(part) for part in local_time.split(":"))
    at = datetime.combine(now_local.date(), time(hours, minutes), tzinfo=now_local.tzinfo)
    return last_sent_on != now_local.date().isoformat() and at <= now_local < at + WINDOW


def water_message(drunk_ml: int, goal_ml: int, language: str = "en") -> dict[str, Any]:
    glasses = round(drunk_ml / GLASS_ML, 1)
    goal = round(goal_ml / GLASS_ML, 1)

    def count(value: float) -> str:
        text = str(int(value)) if float(value).is_integer() else f"{value:.1f}"
        return text.replace(".", ",") if language == "es" else text

    if language == "es":
        return {
            "title": "💧 Hora de tomar agua",
            "body": f"Lleva {count(glasses)} de {count(goal)} vasos hoy. Toque para abrir Relish.",
            "url": "/?water=1",
            "tag": "relish-water",
        }
    return {
        "title": "💧 Time for some water",
        "body": f"{count(glasses)} of {count(goal)} glasses so far today. Tap to open Relish.",
        "url": "/?water=1",
        "tag": "relish-water",
    }


def reminder_test_message(language: str = "en") -> dict[str, Any]:
    if language == "es":
        return {"title": "💧 Los recordatorios de Relish están activos", "body": "Así se verá un recordatorio de agua.", "url": "/", "tag": "relish-test"}
    return {"title": "💧 Relish reminders are on", "body": "This is how a water reminder will look.", "url": "/", "tag": "relish-test"}


def subscription_language(profile: dict[str, Any] | None, subscription: dict[str, Any]) -> str:
    """The profile's chosen language, else the language the app showed when the phone subscribed."""
    if profile and profile.get("language_chosen"):
        return "es" if profile.get("language") == "es" else "en"
    return "es" if subscription.get("language") == "es" else "en"


async def send_to_user(
    repository: SQLiteRepository,
    settings: Settings,
    user_id: str,
    message: Callable[[str], dict[str, Any]],
    client: httpx.AsyncClient,
) -> int:
    """Send to each of the user's subscriptions, each in its language (`message(language)`);
    drop the ones the push service says are gone."""
    sent = 0
    profile = repository.get_user_identity(user_id)
    for row in repository.list_push_subscriptions(user_id):
        result = await send_push(
            Subscription(endpoint=row["endpoint"], p256dh=row["p256dh"], auth=row["auth"]),
            message(subscription_language(profile, row)),
            private_key=settings.vapid_private_key,
            subject=settings.vapid_subject,
            client=client,
        )
        if result.gone:
            repository.delete_push_subscription(endpoint=row["endpoint"])
        elif result.ok:
            repository.mark_push_success(row["endpoint"])
            sent += 1
    return sent


async def run_due_reminders(
    repository: SQLiteRepository, settings: Settings, client: httpx.AsyncClient, now: datetime | None = None
) -> int:
    """Send every reminder that's due now. Returns how many notifications went out."""
    now = now or datetime.now(timezone.utc)
    sent = 0
    for reminder in repository.list_reminders():
        profile = repository.get_user_identity(reminder["user_id"]) or {}
        now_local = now.astimezone(user_zone(profile.get("timezone")))
        if not is_due(reminder["local_time"], reminder.get("last_sent_on"), now_local):
            continue
        today: date = now_local.date()
        repository.mark_reminder_sent(reminder["id"], today)  # once a day, whatever happens next
        if reminder["kind"] == "water":
            drunk = sum(entry["amount_ml"] for entry in repository.list_water_entries(reminder["user_id"], today, today))
            goal = int(profile.get("water_goal_ml") or 2000)
            if drunk >= goal:
                continue  # goal met: no reminder needed
            sent += await send_to_user(
                repository, settings, reminder["user_id"], lambda language: water_message(drunk, goal, language), client
            )
    return sent


async def run_reminder_loop(repository: SQLiteRepository, settings: Settings) -> None:
    async with httpx.AsyncClient(timeout=15) as client:
        while True:
            try:
                await run_due_reminders(repository, settings, client)
            except Exception:  # keep the loop alive; never log subscription details
                logger.exception("Reminder check crashed")
            await asyncio.sleep(CHECK_SECONDS)
