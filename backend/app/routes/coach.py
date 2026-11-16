"""Gus the Gherkin: AI suggestions (the AI picks foods; Relish works out the numbers)."""
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException

from backend.app.config import Settings
from backend.app.dependencies import get_app_settings, get_repository, get_required_session
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.meal_suggest import SuggestRequest, SuggestResponse, suggest_meals
from backend.app.services.vision import VisionNotConfiguredError, request_text_json

router = APIRouter(prefix="/coach", tags=["coach"])
logger = logging.getLogger(__name__)


@router.post("/suggest", response_model=SuggestResponse)
async def suggest(
    payload: SuggestRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> SuggestResponse:
    repository.ensure_user_identity(user_id=session.user_id, email=session.email, display_name=session.display_name)
    try:
        return await suggest_meals(
            repository, settings, session.user_id, payload, ask=lambda prompt: request_text_json(settings, prompt)
        )
    except VisionNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Meal suggestion failed: %s", type(error).__name__)
        raise HTTPException(status_code=502, detail="Gus couldn't reach his ideas right now. Try again in a moment.") from error
