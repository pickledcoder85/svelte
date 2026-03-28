from backend.app.config import get_settings
from backend.app.models.nutrition import MacroTargets, VisionNutritionExtraction


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
