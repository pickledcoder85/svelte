"""Server text in Spanish when the app asks for it (Accept-Language), English otherwise."""

import pytest

from backend.app.i18n import language_from_header, meal_label, translate
from backend.app.services.meal_suggest import clean_ingredients, language_rule, suggestion_prompt, Nutrition
from backend.app.services.portions import quantity_label
from backend.app.services.reminders import subscription_language, water_message


def test_language_from_the_header():
    assert language_from_header("es-CO") == "es"
    assert language_from_header("es-CO,es;q=0.9,en;q=0.8") == "es"
    assert language_from_header("en-US") == "en"
    assert language_from_header(None) == "en"


def test_known_messages_translate_and_unknown_ones_stay_english():
    assert translate("Food not found.", "es") == "No se encontró el alimento."
    assert translate("Food not found.", "en") == "Food not found."
    assert translate("Something brand new.", "es") == "Something brand new."
    assert translate("Ask for at most 400 days, start before end.", "es").startswith("Pida como máximo 400 días")
    assert translate("Gus couldn't put together a complete dinner this time. Try again.", "es") == (
        "Gus no pudo armar una cena completa esta vez. Inténtelo de nuevo."
    )
    assert "un almuerzo" in translate(
        "Only 60 kcal left today, so there isn't room for a lunch. A cup of tea, sparkling water, or some raw veg would fit.", "es"
    )
    assert meal_label("Afternoon snack", "es") == "Onces" and meal_label("Lunch", "en") == "Lunch"


@pytest.mark.asyncio
async def test_error_details_follow_the_apps_language(client, auth_headers):
    english = await client.delete("/api/water/nope", headers=auth_headers)
    spanish = await client.delete("/api/water/nope", headers={**auth_headers, "Accept-Language": "es-CO"})
    assert english.json()["detail"] == "That drink isn't logged."
    assert spanish.status_code == 404 and spanish.json()["detail"] == "Esa bebida no está registrada."


def test_gus_writes_spanish_but_looks_up_in_english():
    prompt = suggestion_prompt(block_label="Lunch", budget=Nutrition(calories=500), profile={}, ingredients=None, language="es")
    assert "Colombian Spanish" in prompt and "usda_query stays in English" in prompt
    assert language_rule("en") == ""
    items = clean_ingredients(
        [{"name": "huevos", "usda_query": "egg whole cooked", "grams": 100, "count": 2, "unit": "large egg",
          "unit_es": "huevo grande", "unit_es_plural": "huevos grandes", "role": "protein"}],
        "es",
    )
    assert items[0]["unit"] == "large egg"  # for USDA measures
    assert items[0]["unit_display"] == "huevo grande" and items[0]["unit_display_plural"] == "huevos grandes"
    assert items[0]["lookup_name"] == "egg whole cooked"
    assert quantity_label(100, 2, "huevo grande", "huevos grandes") == "2 huevos grandes (100 g)"


def test_reminders_in_the_chosen_or_the_phones_language():
    assert water_message(750, 2000, "es")["body"] == "Lleva 3 de 8 vasos hoy. Toque para abrir Relish."
    assert water_message(375, 2000, "es")["body"].startswith("Lleva 1,5 de 8")
    assert subscription_language({"language_chosen": True, "language": "es"}, {"language": "en"}) == "es"
    assert subscription_language({"language_chosen": False, "language": "en"}, {"language": "es"}) == "es"
    assert subscription_language({"language_chosen": True, "language": "en"}, {"language": "es"}) == "en"
