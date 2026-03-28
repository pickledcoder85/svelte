from uuid import uuid4

from fastapi import APIRouter

from backend.app.models.recipes import RecipeDefinition, RecipeImportRequest


router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/import", response_model=RecipeDefinition)
async def import_recipe(payload: RecipeImportRequest) -> RecipeDefinition:
    return RecipeDefinition(
        id=str(uuid4()),
        title=payload.title,
        steps=payload.steps,
        assets=payload.assets,
        ingredients=[],
        default_yield=2,
        favorite=True,
    )
