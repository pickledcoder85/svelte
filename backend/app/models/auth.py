from datetime import datetime, timezone, timedelta
from hashlib import sha256
from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    display_name: str | None = Field(default=None, min_length=1)


class AuthSession(BaseModel):
    user_id: str
    email: str
    display_name: str | None = None
    access_token: str
    expires_at: datetime
    provider: Literal["local", "supabase"] = "local"

    @classmethod
    def create_local(cls, email: str, display_name: str | None = None) -> "AuthSession":
        digest = sha256(f"{email}:{display_name or ''}".encode("utf-8")).hexdigest()
        return cls(
            user_id=f"user-{digest[:12]}",
            email=email,
            display_name=display_name,
            access_token=f"session-{digest[:24]}",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            provider="local",
        )


class SessionResponse(BaseModel):
    session: AuthSession
