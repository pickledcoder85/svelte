from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    intent: Literal["signup", "signin"] = "signup"
    display_name: str | None = Field(default=None, min_length=1)


class AuthSession(BaseModel):
    user_id: str
    email: str
    display_name: str | None = None
    access_token: str
    expires_at: datetime
    provider: Literal["local", "supabase", "tailscale", "dev"] = "local"

    @classmethod
    def create_local(cls, email: str, display_name: str | None = None) -> "AuthSession":
        normalized_email = email.strip().lower()
        token_seed = sha256(normalized_email.encode("utf-8")).hexdigest()
        return cls(
            user_id=user_id_for_email(email),
            email=email,
            display_name=display_name,
            access_token=f"session-{token_seed[:24]}",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            provider="local",
        )

    @classmethod
    def for_owner(
        cls,
        email: str,
        display_name: str | None,
        provider: Literal["tailscale", "dev"],
    ) -> "AuthSession":
        """A per-request owner identity. No token is issued or stored."""
        normalized_email = email.strip().lower()
        return cls(
            user_id=user_id_for_email(normalized_email),
            email=normalized_email,
            display_name=display_name,
            access_token=OWNER_SESSION_TOKEN,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            provider=provider,
        )

    def is_expired(self, now: datetime | None = None) -> bool:
        current = now or datetime.now(timezone.utc)
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return expires_at <= current


# Marker the app sends back for an owner session. It is never a credential: tailscale and
# dev owner identity come from the request itself, not from this value.
OWNER_SESSION_TOKEN = "owner-session"


def user_id_for_email(email: str) -> str:
    """Stable user id derived from the normalized email, shared by every auth mode."""
    normalized_email = email.strip().lower()
    return f"user-{sha256(normalized_email.encode('utf-8')).hexdigest()[:12]}"


class SessionResponse(BaseModel):
    session: AuthSession
