from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.app.config import Settings
from backend.app.dependencies import get_app_settings, get_repository
from backend.app.repositories.sqlite import SQLiteRepository


router = APIRouter(tags=["health"])


@router.get("/health")
async def health(
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, str | bool]:
    return {
        "ok": True,
        "service": "relish-api",
        "environment": settings.app_env,
        "auth_mode": settings.auth_mode,
        "mode": "sqlite-demo" if not settings.usda_api_key else "configured",
        "database": repository.database_path,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
