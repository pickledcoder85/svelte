from datetime import datetime, timezone

from fastapi import APIRouter

from backend.app.config import get_settings


router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "ok": True,
        "service": "nutrition-os-api",
        "environment": settings.app_env,
        "mode": "demo" if not settings.usda_api_key else "configured",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
