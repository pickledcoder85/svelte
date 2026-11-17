"""Water reminders: Web Push encryption and signing, the due-time rules, and the routes. No real pushes."""

import json
from datetime import date, datetime, timezone

import http_ece
import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from backend.app.services.push import Subscription, b64url_decode, b64url_encode, generate_keys, send_push, vapid_headers
from backend.app.services.reminders import is_due, run_due_reminders, water_message
from tests.conftest import isolated_test_settings

PRIVATE, PUBLIC = generate_keys()


def _phone():
    """A fake phone: its key pair and auth secret, as a browser would make them."""
    key = ec.generate_private_key(ec.SECP256R1())
    public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    auth = b"0123456789abcdef"
    return key, auth, Subscription(endpoint="https://web.push.apple.com/abc123", p256dh=b64url_encode(public), auth=b64url_encode(auth))


@pytest.mark.asyncio
async def test_a_push_is_encrypted_for_the_phone_and_signed():
    key, auth, subscription = _phone()
    seen = []

    def handle(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(201)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        result = await send_push(subscription, {"title": "💧", "body": "hi"}, private_key=PRIVATE, subject="mailto:a@b.invalid", client=client)
    assert result.ok and not result.gone
    request = seen[0]
    assert request.headers["Content-Encoding"] == "aes128gcm" and request.headers["TTL"] == "3600"
    assert request.headers["Authorization"].startswith("vapid t=") and f"k={PUBLIC}" in request.headers["Authorization"]
    # Only the phone can read it: decrypt with the phone's private key and auth secret.
    plain = http_ece.decrypt(request.content, private_key=key, auth_secret=auth, version="aes128gcm")
    assert json.loads(plain) == {"title": "💧", "body": "hi"}


def test_the_token_is_for_the_push_services_origin():
    headers = vapid_headers(PRIVATE, "https://web.push.apple.com/abc123?x=1", "mailto:a@b.invalid")
    token = headers["Authorization"].split("t=")[1].split(",")[0]
    claims = json.loads(b64url_decode(token.split(".")[1]))
    assert claims["aud"] == "https://web.push.apple.com" and claims["sub"] == "mailto:a@b.invalid"


@pytest.mark.asyncio
async def test_a_gone_subscription_is_reported():
    _, _, subscription = _phone()
    async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(410))) as client:
        result = await send_push(subscription, {"title": "x"}, private_key=PRIVATE, subject="mailto:a@b.invalid", client=client)
    assert result.gone and not result.ok


def test_due_once_a_day_within_half_an_hour():
    def at(hour, minute):
        return datetime(2026, 11, 17, hour, minute, tzinfo=timezone.utc)
    assert not is_due("10:00", None, at(9, 59))
    assert is_due("10:00", None, at(10, 0))
    assert is_due("10:00", None, at(10, 29))
    assert not is_due("10:00", None, at(10, 30))  # too late: not sent stale
    assert not is_due("10:00", "2026-11-17", at(10, 5))  # already sent today
    assert is_due("10:00", "2026-11-16", at(10, 5))


def test_the_message_counts_glasses():
    message = water_message(750, 2000)
    assert message["body"].startswith("3 of 8 glasses") and message["url"] == "/?water=1"


@pytest.mark.asyncio
async def test_due_reminders_go_out_once_and_skip_a_met_goal(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")
    repository.update_user_preferences(user_id="u1", timezone="America/Chicago")
    _, _, subscription = _phone()
    repository.save_push_subscription(user_id="u1", endpoint=subscription.endpoint, p256dh=subscription.p256dh, auth=subscription.auth)
    repository.set_reminder_times(user_id="u1", kind="water", times=["10:00", "15:00"])
    settings = isolated_test_settings().model_copy(update={"vapid_private_key": PRIVATE, "vapid_public_key": PUBLIC})
    pushes = []

    def handle(request):
        pushes.append(request)
        return httpx.Response(201)

    ten_chicago = datetime(2026, 11, 17, 16, 5, tzinfo=timezone.utc)  # 10:05 CST
    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        assert await run_due_reminders(repository, settings, client, now=ten_chicago) == 1
        assert await run_due_reminders(repository, settings, client, now=ten_chicago) == 0  # once
        # The goal is met by 15:00: no reminder.
        repository.add_water_entry(user_id="u1", logged_on=date(2026, 11, 17), amount_ml=2000)
        three_chicago = datetime(2026, 11, 17, 21, 1, tzinfo=timezone.utc)
        assert await run_due_reminders(repository, settings, client, now=three_chicago) == 0
    assert len(pushes) == 1
    assert repository.list_push_subscriptions("u1")[0]["last_success_at"]


@pytest.mark.asyncio
async def test_a_gone_phone_is_forgotten(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")
    _, _, subscription = _phone()
    repository.save_push_subscription(user_id="u1", endpoint=subscription.endpoint, p256dh=subscription.p256dh, auth=subscription.auth)
    repository.set_reminder_times(user_id="u1", kind="water", times=["10:00"])
    settings = isolated_test_settings().model_copy(update={"vapid_private_key": PRIVATE, "vapid_public_key": PUBLIC})
    async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(410))) as client:
        await run_due_reminders(repository, settings, client, now=datetime(2026, 11, 17, 10, 1, tzinfo=timezone.utc))
    assert repository.list_push_subscriptions("u1") == []


def test_reminder_times_keep_their_sent_day(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")
    repository.set_reminder_times(user_id="u1", kind="water", times=["10:00", "15:00"])
    ten = next(row for row in repository.list_reminders("u1") if row["local_time"] == "10:00")
    repository.mark_reminder_sent(ten["id"], date(2026, 11, 17))
    repository.set_reminder_times(user_id="u1", kind="water", times=["10:00", "18:00"])
    rows = {row["local_time"]: row["last_sent_on"] for row in repository.list_reminders("u1")}
    assert rows == {"10:00": "2026-11-17", "18:00": None}
    repository.set_reminder_times(user_id="u1", kind="water", times=[])
    assert repository.list_reminders("u1") == []


@pytest.mark.asyncio
async def test_notification_routes(app, client, auth_headers):
    status = (await client.get("/api/notifications", headers=auth_headers)).json()
    assert status == {"configured": False, "public_key": None, "subscribed": False, "water_times": []}
    app.state.settings = app.state.settings.model_copy(update={"vapid_private_key": PRIVATE, "vapid_public_key": PUBLIC})
    _, _, subscription = _phone()
    body = {"endpoint": subscription.endpoint, "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth}}
    status = (await client.post("/api/notifications/subscription", headers=auth_headers, json=body)).json()
    assert status["configured"] and status["subscribed"] and status["public_key"] == PUBLIC
    status = (await client.put("/api/notifications/reminders", headers=auth_headers, json={"times": ["15:00", "10:00", "10:00"]})).json()
    assert status["water_times"] == ["10:00", "15:00"]
    bad = await client.put("/api/notifications/reminders", headers=auth_headers, json={"times": ["25:00"]})
    assert bad.status_code == 422
    plain_http = await client.post("/api/notifications/subscription", headers=auth_headers, json={**body, "endpoint": "http://evil.example/x123"})
    assert plain_http.status_code == 422
    elsewhere = await client.post("/api/notifications/subscription", headers=auth_headers, json={**body, "endpoint": "https://169.254.169.254/latest"})
    assert elsewhere.status_code == 422
    lookalike = await client.post("/api/notifications/subscription", headers=auth_headers, json={**body, "endpoint": "https://web.push.apple.com.evil.example/x"})
    assert lookalike.status_code == 422
    status = (await client.post("/api/notifications/subscription/remove", headers=auth_headers, json={"endpoint": subscription.endpoint})).json()
    assert status["subscribed"] is False
