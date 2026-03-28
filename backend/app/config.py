from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Nutrition OS API"
    app_env: str = "development"
    usda_api_key: str = ""
    openai_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
