from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from backend.app.db.database import DEFAULT_DATABASE_URL, resolve_sqlite_path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Nutrition OS API"
    app_env: str = "development"
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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
