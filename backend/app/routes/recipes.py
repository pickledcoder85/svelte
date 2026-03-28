from fastapi import APIRouter, HTTPException, Path

from backend.app.models.recipes import RecipeDefinition, RecipeImportRequest
from backend.app.repositories.memory import get_demo_repository
from backend.app.services.recipes import get_recipe, import_recipe, list_recipes, scale_recipe


router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/import", response_model=RecipeDefinition)
async def import_recipe_route(payload: RecipeImportRequest) -> RecipeDefinition:
    repository = get_demo_repository()
    return import_recipe(repository, payload)


@router.get("", response_model=list[RecipeDefinition])
async def list_recipes_route() -> list[RecipeDefinition]:
    repository = get_demo_repository()
    return list_recipes(repository)


@router.get("/{recipe_id}", response_model=RecipeDefinition)
async def get_recipe_route(recipe_id: str) -> RecipeDefinition:
    repository = get_demo_repository()
    recipe = get_recipe(repository, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe


@router.get("/{recipe_id}/scale/{factor}", response_model=RecipeDefinition)
async def scale_recipe_route(
    recipe_id: str,
    factor: float = Path(..., ge=0.1, le=10.0),
) -> RecipeDefinition:
    if factor not in {1.25, 1.5, 2.0}:
        raise HTTPException(status_code=400, detail="Supported factors are 1.25, 1.5, and 2.0.")

    repository = get_demo_repository()
    recipe = get_recipe(repository, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return scale_recipe(recipe, factor)
