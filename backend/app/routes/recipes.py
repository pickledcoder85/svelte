from fastapi import APIRouter, Depends, HTTPException, Path

from backend.app.dependencies import get_current_session, get_required_session, get_repository
from backend.app.models.auth import AuthSession
from backend.app.models.recipes import RecipeCreateRequest, RecipeDefinition, RecipeImportRequest, RecipeUpdateRequest
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.favorites import favorite_recipe, list_favorite_recipes, unfavorite_recipe
from backend.app.services.recipes import create_recipe, get_recipe, import_recipe, list_recipes, scale_recipe, update_recipe


router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("", response_model=RecipeDefinition)
async def create_recipe_route(
    payload: RecipeCreateRequest, repository: SQLiteRepository = Depends(get_repository)
) -> RecipeDefinition:
    return create_recipe(repository, payload)


@router.post("/import", response_model=RecipeDefinition)
async def import_recipe_route(
    payload: RecipeImportRequest, repository: SQLiteRepository = Depends(get_repository)
) -> RecipeDefinition:
    return import_recipe(repository, payload)


@router.get("", response_model=list[RecipeDefinition])
async def list_recipes_route(
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[RecipeDefinition]:
    user_id = session.user_id if session is not None else None
    return list_recipes(repository, user_id=user_id)


@router.get("/favorites", response_model=list[RecipeDefinition])
async def list_favorite_recipes_route(
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> list[RecipeDefinition]:
    return list_favorite_recipes(repository, session.user_id)


@router.get("/{recipe_id}", response_model=RecipeDefinition)
async def get_recipe_route(
    recipe_id: str,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> RecipeDefinition:
    user_id = session.user_id if session is not None else None
    recipe = get_recipe(repository, recipe_id, user_id=user_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe


@router.put("/{recipe_id}", response_model=RecipeDefinition)
async def update_recipe_route(
    recipe_id: str,
    payload: RecipeUpdateRequest,
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> RecipeDefinition:
    recipe = update_recipe(repository, recipe_id, payload, user_id=session.user_id if session is not None else None)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe


@router.get("/{recipe_id}/scale/{factor}", response_model=RecipeDefinition)
async def scale_recipe_route(
    recipe_id: str,
    factor: float = Path(..., ge=0.1, le=10.0),
    session: AuthSession | None = Depends(get_current_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> RecipeDefinition:
    if factor not in {1.25, 1.5, 2.0}:
        raise HTTPException(status_code=400, detail="Supported factors are 1.25, 1.5, and 2.0.")
    user_id = session.user_id if session is not None else None
    recipe = get_recipe(repository, recipe_id, user_id=user_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return scale_recipe(recipe, factor)


@router.post("/{recipe_id}/favorite", response_model=RecipeDefinition)
async def favorite_recipe_route(
    recipe_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> RecipeDefinition:
    recipe = favorite_recipe(repository, session.user_id, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe


@router.delete("/{recipe_id}/favorite", response_model=RecipeDefinition)
async def unfavorite_recipe_route(
    recipe_id: str,
    session = Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> RecipeDefinition:
    recipe = unfavorite_recipe(repository, session.user_id, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe
