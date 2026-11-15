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
    # When set, a snapshot of the database is written here before each startup (startup
    # runs schema repairs on the live file). Keep the newest `backup_keep` snapshots.
    backup_dir: str = ""
    backup_keep: int = 14
    # Built Expo web app (`npm run build:web` in frontend/). When set, FastAPI serves it on
    # the same origin as the API.
    web_dist_dir: str = ""
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
    # Garmin Connect personal API key (the owner's own data, pull only). Empty: Garmin is off.
    garmin_personal_api_key: str = ""
    # Sync Garmin every 30 minutes while the app runs (when a key is set).
    garmin_background_sync: bool = True
    # Cheapest current, non-deprecated OpenAI model with image input (decided 2026-11-14).
    # Change it here or with VISION_MODEL when OpenAI retires it.
    vision_model: str = "gpt-6-luna"
    # Label extraction is transcription, not reasoning; "none" keeps scans cheap and fast.
    vision_reasoning_effort: Literal["none", "low", "medium", "high"] = "none"
    # Base64 characters accepted per image (about 6 MB of image data).
    vision_max_image_base64_chars: int = 8_000_000

    @property
    def database_path(self) -> str:
        return resolve_sqlite_path(self.database_url)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def vision_demo_fallback_allowed(self) -> bool:
        """Demo scan results only outside production, so fake nutrition is never saved for real."""
        return not self.is_production

    def validate_startup(self) -> None:
        """Fail fast on settings that would leave a deployed app open or lose data."""
        if self.auth_mode == "tailscale" and not self.owner_email.strip():
            raise RuntimeError("AUTH_MODE=tailscale requires OWNER_EMAIL.")
        if self.is_production:
            if self.auth_mode != "tailscale":
                raise RuntimeError("APP_ENV=production requires AUTH_MODE=tailscale.")
            if self.dev_auto_login:
                raise RuntimeError("DEV_AUTO_LOGIN must be off when APP_ENV=production.")
            if not self.backup_dir.strip() or not Path(self.backup_dir).is_absolute():
                raise RuntimeError(
                    "APP_ENV=production requires an absolute BACKUP_DIR, "
                    "for example /var/lib/relish/backups."
                )
            if not _is_absolute_sqlite_url(self.database_url):
                raise RuntimeError(
                    "APP_ENV=production requires an absolute DATABASE_URL, "
                    "for example sqlite:////var/lib/relish/relish.db."
                )
        if self.dev_auto_login and not self.owner_email.strip():
            raise RuntimeError("DEV_AUTO_LOGIN requires OWNER_EMAIL.")


def _is_absolute_sqlite_url(database_url: str) -> bool:
    prefix = "sqlite:///"
    return database_url.startswith(prefix) and Path(database_url.removeprefix(prefix)).is_absolute()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
