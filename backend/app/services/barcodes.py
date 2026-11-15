"""Barcode lookup: your food bank, then Open Food Facts, then USDA branded foods (with a key)."""

import logging
from collections.abc import Callable

import httpx

from backend.app.integrations.barcodes import lookup_forms, normalize_barcode
from backend.app.integrations.open_food_facts import OpenFoodFactsError, fetch_product, product_to_label
from backend.app.integrations.usda import UsdaSearchError, branded_food_to_label, find_branded_food_by_barcode
from backend.app.models.ingestion import BarcodeFoodResult, BarcodeLookupResult
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.ingestion import (
    IngestionSaveError,
    create_scan_output,
    save_food_from_output,
    transition_output,
)

logger = logging.getLogger(__name__)
NOT_FOUND_MESSAGE = "We couldn't find this barcode. Photograph the nutrition label instead."


def _pending_scan(repository: SQLiteRepository, user_id: str, label: dict, source: str, gtin: str):
    output = create_scan_output(
        repository,
        user_id,
        source_kind="barcode",
        source_name=f"barcode-{gtin}",
        extracted_text=label["label_text"],
        structured_json=label,
        confidence=label["confidence"],
    )
    return BarcodeLookupResult(barcode=gtin, found=True, source=source, output=output)


async def lookup_barcode(
    repository: SQLiteRepository,
    user_id: str,
    raw_code: str,
    *,
    usda_api_key: str = "",
    client_factory: Callable[[], httpx.AsyncClient] | None = None,
) -> BarcodeLookupResult:
    """Raises InvalidBarcodeError for codes that fail validation."""
    gtin = normalize_barcode(raw_code)

    saved = repository.get_food_by_barcode(gtin)
    if saved is not None:
        return BarcodeLookupResult(barcode=gtin, found=True, source="food_bank", food=saved)

    factory = client_factory or (lambda: httpx.AsyncClient())
    problems: list[str] = []
    async with factory() as client:
        for code in lookup_forms(gtin):
            try:
                product = await fetch_product(code, client)
            except OpenFoodFactsError as error:
                logger.warning("Open Food Facts lookup failed: %s", error)
                problems.append("open_food_facts")
                break
            label = product_to_label(product, gtin) if product else None
            if label:
                return _pending_scan(repository, user_id, label, "open_food_facts", gtin)

        if usda_api_key:
            try:
                food = await find_branded_food_by_barcode(lookup_forms(gtin), usda_api_key, client)
            except UsdaSearchError as error:
                logger.warning("USDA barcode lookup failed: %s", error)
                problems.append("usda")
                food = None
            label = branded_food_to_label(food, gtin) if food else None
            if label:
                return _pending_scan(repository, user_id, label, "usda", gtin)

    message = NOT_FOUND_MESSAGE
    if problems:
        message = "Food databases couldn't be reached. Photograph the nutrition label instead."
    return BarcodeLookupResult(barcode=gtin, found=False, message=message)


SAVE_FAILED_MESSAGE = "This product's nutrition is incomplete. Photograph the nutrition label instead."


async def food_for_barcode(
    repository: SQLiteRepository,
    user_id: str,
    raw_code: str,
    *,
    usda_api_key: str = "",
    client_factory: Callable[[], httpx.AsyncClient] | None = None,
) -> BarcodeFoodResult:
    """Quick add from Today: look the barcode up and save the food to the user's bank in one
    step (the app shows the numbers before anything is logged). Raises InvalidBarcodeError."""
    result = await lookup_barcode(
        repository, user_id, raw_code, usda_api_key=usda_api_key, client_factory=client_factory
    )
    if result.food is not None:
        repository.add_to_food_bank(user_id=user_id, food_id=result.food.id)
        return BarcodeFoodResult(barcode=result.barcode, found=True, source=result.source, foods=[result.food])
    if result.output is None:
        return BarcodeFoodResult(barcode=result.barcode, found=False, message=result.message)
    try:
        transition_output(repository, user_id, result.output.id, "accepted")
        saved = await save_food_from_output(repository, user_id, result.output.id)
    except IngestionSaveError:
        return BarcodeFoodResult(barcode=result.barcode, found=False, message=SAVE_FAILED_MESSAGE)
    return BarcodeFoodResult(barcode=result.barcode, found=True, source=result.source, foods=saved.saved_foods)
