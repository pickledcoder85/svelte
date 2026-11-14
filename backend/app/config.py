from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

from backend.app.db.database import DEFAULT_DATABASE_URL, resolve_sqlite_path


# Anchored to the repo root so a service started from another working directory still
# reads the same .env instead of silently falling back to development defaults.
REPO_ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT_ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "Relish API"
    # Only these exact values are accepted, so a typo such as "prod" fails at startup instead
    # of booting an open development server.
    app_env: Literal["development", "test", "production"] = "development"
    # "tailscale": identity comes from the Tailscale Serve `Tailscale-User-Login` header and
    # must match `owner_email` (required in production). "local": development/test bearer
    # sessions from POST /api/auth/session.
    auth_mode: Literal["local", "tailscale"] = "local"
    owner_email: str = ""
    # Local development only: treat requests without a valid session as the owner.
    dev_auto_login: bool = False
    database_url: str = DEFAULT_DATABASE_URL
    cors_origins: str = ",".join(
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:19006",
            "http://127.0.0.1:19006",
        ]
    )
    usda_api_key: str = ""
    openai_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""

    @property
    def database_path(self) -> str:
        return resolve_sqlite_path(self.database_url)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    def validate_auth(self) -> None:
        """Fail fast on auth settings that would leave a deployed app open."""
        if self.auth_mode == "tailscale" and not self.owner_email.strip():
            raise RuntimeError("AUTH_MODE=tailscale requires OWNER_EMAIL.")
        if self.is_production:
            if self.auth_mode != "tailscale":
                raise RuntimeError("APP_ENV=production requires AUTH_MODE=tailscale.")
            if self.dev_auto_login:
                raise RuntimeError("DEV_AUTO_LOGIN must be off when APP_ENV=production.")
        if self.dev_auto_login and not self.owner_email.strip():
            raise RuntimeError("DEV_AUTO_LOGIN requires OWNER_EMAIL.")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
