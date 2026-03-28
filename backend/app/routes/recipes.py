from fastapi import APIRouter, Depends, HTTPException, Path

from backend.app.dependencies import get_repository
from backend.app.models.recipes import FavoriteRecipeRequest, RecipeDefinition, RecipeImportRequest
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.favorites import list_favorite_recipes, set_recipe_favorite
from backend.app.services.recipes import get_recipe, import_recipe, list_recipes, scale_recipe


router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/import", response_model=RecipeDefinition)
async def import_recipe_route(
    payload: RecipeImportRequest, repository: SQLiteRepository = Depends(get_repository)
) -> RecipeDefinition:
    return import_recipe(repository, payload)


@router.get("", response_model=list[RecipeDefinition])
async def list_recipes_route(repository: SQLiteRepository = Depends(get_repository)) -> list[RecipeDefinition]:
    return list_recipes(repository)


@router.get("/favorites", response_model=list[RecipeDefinition])
async def list_favorite_recipes_route(
    repository: SQLiteRepository = Depends(get_repository),
) -> list[RecipeDefinition]:
    return list_favorite_recipes(repository)


@router.get("/{recipe_id}", response_model=RecipeDefinition)
async def get_recipe_route(
    recipe_id: str, repository: SQLiteRepository = Depends(get_repository)
) -> RecipeDefinition:
    recipe = get_recipe(repository, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe


@router.get("/{recipe_id}/scale/{factor}", response_model=RecipeDefinition)
async def scale_recipe_route(
    recipe_id: str,
    factor: float = Path(..., ge=0.1, le=10.0),
    repository: SQLiteRepository = Depends(get_repository),
) -> RecipeDefinition:
    if factor not in {1.25, 1.5, 2.0}:
        raise HTTPException(status_code=400, detail="Supported factors are 1.25, 1.5, and 2.0.")
    recipe = get_recipe(repository, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return scale_recipe(recipe, factor)


@router.put("/{recipe_id}/favorite", response_model=RecipeDefinition)
async def update_recipe_favorite(
    recipe_id: str,
    payload: FavoriteRecipeRequest,
    repository: SQLiteRepository = Depends(get_repository),
) -> RecipeDefinition:
    recipe = set_recipe_favorite(repository, recipe_id, payload)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe
