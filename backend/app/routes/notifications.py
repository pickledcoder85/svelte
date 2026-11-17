"""Reminder notifications: the app's push subscription, the reminder times, and a test."""
import re
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from backend.app.dependencies import get_repository, get_required_session
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.reminders import REMINDER_KINDS, reminders_configured, send_to_user

router = APIRouter(prefix="/notifications", tags=["notifications"])
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
# Browsers' push services. The server POSTs to the subscription's endpoint, so only these hosts
# are accepted (never an arbitrary URL).
PUSH_HOSTS = ("push.apple.com", "fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com")
MAX_TIMES = 12


class NotificationStatus(BaseModel):
    configured: bool
    public_key: str | None
    subscribed: bool
    water_times: list[str]


class SubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=10, max_length=200)
    auth: str = Field(min_length=10, max_length=100)


class SubscriptionPayload(BaseModel):
    endpoint: str = Field(min_length=10, max_length=1000)
    keys: SubscriptionKeys

    @field_validator("endpoint")
    @classmethod
    def _https(cls, value: str) -> str:
        parsed = urlparse(value)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or not any(host == known or host.endswith(f".{known}") for known in PUSH_HOSTS):
            raise ValueError("That isn't a browser push service.")
        return value


class UnsubscribePayload(BaseModel):
    endpoint: str = Field(min_length=10, max_length=1000)


class ReminderTimes(BaseModel):
    kind: str = "water"
    times: list[str] = Field(default_factory=list, max_length=MAX_TIMES)

    @field_validator("kind")
    @classmethod
    def _known(cls, value: str) -> str:
        if value not in REMINDER_KINDS:
            raise ValueError(f"kind must be one of {', '.join(REMINDER_KINDS)}.")
        return value

    @field_validator("times")
    @classmethod
    def _clock(cls, value: list[str]) -> list[str]:
        for item in value:
            if not TIME.match(item):
                raise ValueError("Times are 24-hour HH:MM, e.g. 15:00.")
        return sorted(set(value))


def _status(request: Request, repository: SQLiteRepository, user_id: str) -> NotificationStatus:
    settings = request.app.state.settings
    configured = reminders_configured(settings)
    return NotificationStatus(
        configured=configured,
        public_key=settings.vapid_public_key if configured else None,
        subscribed=bool(repository.list_push_subscriptions(user_id)),
        water_times=[row["local_time"] for row in repository.list_reminders(user_id, "water")],
    )


@router.get("", response_model=NotificationStatus)
async def read_notifications(request: Request, session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)):
    return _status(request, repository, session.user_id)


@router.post("/subscription", response_model=NotificationStatus)
async def subscribe(payload: SubscriptionPayload, request: Request, session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)):
    repository.save_push_subscription(user_id=session.user_id, endpoint=payload.endpoint, p256dh=payload.keys.p256dh, auth=payload.keys.auth)
    return _status(request, repository, session.user_id)


@router.post("/subscription/remove", response_model=NotificationStatus)
async def unsubscribe(payload: UnsubscribePayload, request: Request, session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)):
    repository.delete_push_subscription(endpoint=payload.endpoint, user_id=session.user_id)
    return _status(request, repository, session.user_id)


@router.put("/reminders", response_model=NotificationStatus)
async def set_reminders(payload: ReminderTimes, request: Request, session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)):
    repository.set_reminder_times(user_id=session.user_id, kind=payload.kind, times=payload.times)
    return _status(request, repository, session.user_id)


@router.post("/test")
async def send_test(request: Request, session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)) -> dict[str, int]:
    settings = request.app.state.settings
    if not reminders_configured(settings):
        raise HTTPException(status_code=409, detail="Reminders aren't set up on the server yet.")
    message = {"title": "💧 Relish reminders are on", "body": "This is how a water reminder will look.", "url": "/", "tag": "relish-test"}
    async with httpx.AsyncClient(timeout=15) as client:
        sent = await send_to_user(repository, settings, session.user_id, message, client)
    if sent == 0:
        raise HTTPException(status_code=409, detail="No phone could be reached. Turn reminders off and on again.")
    return {"sent": sent}
