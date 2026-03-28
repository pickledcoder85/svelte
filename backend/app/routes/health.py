from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.app.config import get_settings
from backend.app.dependencies import get_repository
from backend.app.repositories.sqlite import SQLiteRepository


router = APIRouter(tags=["health"])


@router.get("/health")
async def health(repository: SQLiteRepository = Depends(get_repository)) -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "ok": True,
        "service": "nutrition-os-api",
        "environment": settings.app_env,
        "mode": "sqlite-demo" if not settings.usda_api_key else "configured",
        "database": repository.database_path,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
