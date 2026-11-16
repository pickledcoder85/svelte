"""Gus the Gherkin: AI suggestions (the AI picks foods; Relish works out the numbers)."""
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException

from backend.app.config import Settings
from backend.app.dependencies import get_app_settings, get_repository, get_required_session
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.meal_planner import (
    CreatePlanRequest,
    CreatePlanResponse,
    ProposeRequest,
    ProposeResponse,
    create_plan,
    propose_meals,
)
from backend.app.services.meal_suggest import SuggestRequest, SuggestResponse, suggest_meals
from backend.app.services.vision import (
    VisionImageError,
    VisionNotConfiguredError,
    _request_vision_json,
    prepare_image_data_url,
    request_text_json,
)

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
        if payload.image_base64:
            if not settings.openai_api_key:
                raise VisionNotConfiguredError("Suggestions are not set up on this server.")
            image_url = prepare_image_data_url(payload.image_base64, settings)

            async def ask(prompt: str):
                return await _request_vision_json(settings, image_url, prompt)
        else:

            async def ask(prompt: str):
                return await request_text_json(settings, prompt)

        return await suggest_meals(repository, settings, session.user_id, payload, ask=ask)
    except VisionImageError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except VisionNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Meal suggestion failed: %s", type(error).__name__)
        raise HTTPException(status_code=502, detail="Gus couldn't reach his ideas right now. Try again in a moment.") from error


@router.post("/plan/propose", response_model=ProposeResponse)
async def plan_propose(
    payload: ProposeRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
    settings: Settings = Depends(get_app_settings),
) -> ProposeResponse:
    """Create a Meal Plan: Gus proposes one complete meal for each requested meal type."""
    repository.ensure_user_identity(user_id=session.user_id, email=session.email, display_name=session.display_name)
    try:
        return await propose_meals(
            repository, settings, session.user_id, payload, ask=lambda prompt: request_text_json(settings, prompt)
        )
    except VisionNotConfiguredError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Meal plan proposal failed: %s", type(error).__name__)
        raise HTTPException(status_code=502, detail="Gus couldn't reach his ideas right now. Try again in a moment.") from error


@router.post("/plan/create", response_model=CreatePlanResponse)
async def plan_create(
    payload: CreatePlanRequest,
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> CreatePlanResponse:
    """Add the accepted meals to their days (replace or keep meals already planned)."""
    repository.ensure_user_identity(user_id=session.user_id, email=session.email, display_name=session.display_name)
    return create_plan(repository, session.user_id, payload)
