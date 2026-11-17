"""Web Push: send a notification to the owner's installed app (RFC 8030 / 8291 / 8292).

The phone's browser gives Relish a push subscription (an endpoint at Apple's or Google's push
service plus two keys). Each message is encrypted for that subscription (aes128gcm, with
`http_ece`), signed with Relish's VAPID key (`py_vapid`), and POSTed with httpx. The push
service delivers it even when the app is closed; only the phone can read it.

Keys: VAPID_PRIVATE_KEY / VAPID_PUBLIC_KEY in the server's environment (base64url, raw P-256),
made once with `python -m scripts.generate_vapid_keys`. Without them, reminders are off.
"""
from __future__ import annotations

import base64
import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import http_ece
import httpx
from cryptography.hazmat.primitives.asymmetric import ec
from py_vapid import Vapid02

logger = logging.getLogger(__name__)

# A reminder that can't be delivered within an hour isn't worth showing late.
TTL_SECONDS = 3600
TOKEN_SECONDS = 12 * 3600


def b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


@dataclass(frozen=True)
class Subscription:
    endpoint: str
    p256dh: str
    auth: str


@dataclass(frozen=True)
class PushResult:
    ok: bool
    # The push service says the subscription no longer exists (uninstalled, permission off).
    gone: bool
    status: int | None


def encrypt(payload: bytes, subscription: Subscription) -> bytes:
    """The message encrypted for one subscription (aes128gcm, a fresh key and salt each time)."""
    return http_ece.encrypt(
        payload,
        salt=os.urandom(16),
        private_key=ec.generate_private_key(ec.SECP256R1()),
        dh=b64url_decode(subscription.p256dh),
        auth_secret=b64url_decode(subscription.auth),
        version="aes128gcm",
    )


def vapid_headers(private_key: str, endpoint: str, subject: str) -> dict[str, str]:
    """The Authorization header: a short-lived token for the push service's origin."""
    parsed = urlparse(endpoint)
    vapid = Vapid02.from_raw(private_key.encode())  # it base64url-decodes the key itself
    claims = {"aud": f"{parsed.scheme}://{parsed.netloc}", "exp": int(time.time()) + TOKEN_SECONDS, "sub": subject}
    return {key: value.decode() if isinstance(value, bytes) else value for key, value in vapid.sign(claims).items()}


async def send_push(
    subscription: Subscription,
    message: dict[str, Any],
    *,
    private_key: str,
    subject: str,
    client: httpx.AsyncClient,
) -> PushResult:
    """Send one message. Never raises for delivery problems: the result says what happened."""
    body = encrypt(json.dumps(message, separators=(",", ":")).encode(), subscription)
    headers = {
        **vapid_headers(private_key, subscription.endpoint, subject),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": str(TTL_SECONDS),
        "Urgency": "normal",
    }
    try:
        response = await client.post(subscription.endpoint, content=body, headers=headers)
    except httpx.HTTPError as error:
        # The endpoint is a capability URL: log the push service's host only.
        logger.warning("Push to %s failed: %s", urlparse(subscription.endpoint).netloc, type(error).__name__)
        return PushResult(ok=False, gone=False, status=None)
    if response.status_code in (404, 410):
        return PushResult(ok=False, gone=True, status=response.status_code)
    if response.status_code >= 400:
        logger.warning("Push to %s refused: %s", urlparse(subscription.endpoint).netloc, response.status_code)
    return PushResult(ok=response.status_code < 300, gone=False, status=response.status_code)


def generate_keys() -> tuple[str, str]:
    """(private, public) VAPID keys, base64url: the raw private number and the uncompressed
    public point (what the app passes to pushManager.subscribe)."""
    from cryptography.hazmat.primitives import serialization

    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_numbers().private_value.to_bytes(32, "big")
    public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return b64url_encode(private), b64url_encode(public)
