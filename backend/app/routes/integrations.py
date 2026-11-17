"""Connected apps (Garmin): status and Sync now."""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from backend.app.config import Settings
from backend.app.dependencies import get_app_settings, get_repository, get_required_session
from backend.app.i18n import request_language, translate
from backend.app.integrations.garmin import GarminError
from backend.app.models.auth import AuthSession
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.garmin_sync import garmin_configured, garmin_status, sync_garmin

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/garmin")
async def get_garmin_status(
    request: Request,
    session: AuthSession = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    status = garmin_status(repository, settings, session.user_id)
    if isinstance(status.get("last_error"), str):
        status = {**status, "last_error": translate(status["last_error"], request_language(request))}
    return status


@router.post("/garmin/sync")
async def post_garmin_sync(
    session: AuthSession = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    if not garmin_configured(settings):
        raise HTTPException(status_code=409, detail="Garmin isn't connected.")
    repository.ensure_user_identity(user_id=session.user_id, email=session.email, display_name=session.display_name)
    try:
        return await sync_garmin(repository, settings, session.user_id)
    except GarminError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
