from backend.app.config import get_settings
from backend.app.models.nutrition import (
    MacroTargets,
    VisionFoodMatchCandidate,
    VisionNutritionExtraction,
    VisionPackageExtraction,
)
from backend.app.repositories.sqlite import SQLiteRepository


async def analyze_label_image(_: str) -> VisionNutritionExtraction:
    settings = get_settings()

    if not settings.openai_api_key:
        return VisionNutritionExtraction(
            label_text="Demo OCR output",
            product_name="Scanned food product",
            brand_name="Unknown brand",
            serving_size="1 serving",
            calories=120,
            macros=MacroTargets(protein=8, carbs=12, fat=4),
            confidence=0.62,
        )

    # Placeholder response until the multimodal extraction client is wired.
    return VisionNutritionExtraction(
        label_text="Sample OCR output",
        product_name="Scanned food product",
        brand_name="Unknown brand",
        serving_size="1 serving",
        calories=120,
        macros=MacroTargets(protein=8, carbs=12, fat=4),
        confidence=0.62,
    )


async def analyze_package_image(
    _: str,
    repository: SQLiteRepository,
) -> VisionPackageExtraction:
    settings = get_settings()
    product_name = "Rolled oats"
    brand_name = "Pantry staple"

    candidates = repository.search_foods(product_name)[:3]
    match_candidates = [
        VisionFoodMatchCandidate(
            food_id=food.id,
            name=food.name,
            brand=food.brand,
            source=food.source,
            confidence=round(max(0.35, 0.92 - (index * 0.12)), 2),
        )
        for index, food in enumerate(candidates)
    ]

    if settings.openai_api_key:
        return VisionPackageExtraction(
            package_text="Sample package-front output",
            product_name=product_name,
            brand_name=brand_name,
            confidence=0.71,
            match_candidates=match_candidates,
        )

    return VisionPackageExtraction(
        package_text="Demo package-front output",
        product_name=product_name,
        brand_name=brand_name,
        confidence=0.71,
        match_candidates=match_candidates,
    )
