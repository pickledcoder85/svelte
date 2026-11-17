"""Server text in the app's language (English, or Colombian Spanish addressing the user as "usted").

The app sends `Accept-Language: es-CO` when it shows Spanish. The server keeps writing its
messages in English; error details and the user-facing message fields are translated on the
way out with `translate()`. Anything not in the table stays English, so nothing breaks.
"""
from __future__ import annotations

import re
from typing import Literal

from fastapi import Request

Language = Literal["en", "es"]


def language_from_header(value: str | None) -> Language:
    first = (value or "").split(",")[0].strip().lower()
    return "es" if first.startswith("es") else "en"


def request_language(request: Request) -> Language:
    return language_from_header(request.headers.get("accept-language"))


# Meal and block names (LABELS in services/meal_split.py and the planner).
MEAL_LABELS_ES = {
    "Breakfast": "Desayuno",
    "Lunch": "Almuerzo",
    "Dinner": "Cena",
    "Snack": "Refrigerio",
    "Morning snack": "Media mañana",
    "Afternoon snack": "Onces",
    "Other": "Otro",
}


def meal_label(label: str, language: Language) -> str:
    return MEAL_LABELS_ES.get(label, label) if language == "es" else label


ES: dict[str, str] = {
    # Not found and gone
    "Not found.": "No se encontró.",
    "Food not found.": "No se encontró el alimento.",
    "Food log not found.": "No se encontró el registro de comidas.",
    "Food log entry not found.": "No se encontró ese registro.",
    "Exercise entry not found.": "No se encontró el entrenamiento.",
    "Meal plan slot not found.": "No se encontró esa comida del plan.",
    "Meal prep task not found.": "No se encontró esa tarea de preparación.",
    "Meal template not found.": "No se encontró esa comida guardada.",
    "Planned exercise entry not found.": "No se encontró el entrenamiento planeado.",
    "Planned workout session not found.": "No se encontró el entrenamiento planeado.",
    "Recipe not found.": "No se encontró la receta.",
    "That drink isn't logged.": "Esa bebida no está registrada.",
    "That food isn't in your food bank.": "Ese alimento no está en su despensa.",
    "Add this food to your food bank first.": "Primero agregue este alimento a su despensa.",
    "That item is gone.": "Ese artículo ya no existe.",
    "That shopping list is gone.": "Esa lista de mercado ya no existe.",
    "Ingestion job not found.": "No se encontró ese escaneo.",
    "Ingestion output not found.": "No se encontró ese resultado del escaneo.",
    "Ingestion job is not owned by the active user.": "Ese escaneo no es suyo.",
    # Plans and workouts
    "This exercise came from a planned workout. Edit the planned workout instead.":
        "Este entrenamiento viene de uno planeado. Edite el entrenamiento planeado.",
    "Unable to add the meal to the plan.": "No se pudo agregar la comida al plan.",
    "Supported factors are 1.25, 1.5, and 2.0.": "Los factores disponibles son 1,25, 1,5 y 2,0.",
    "Give either servings or grams.": "Indique porciones o gramos, no ambos.",
    # Meal balance
    "Meals per day must be 3, 4, or 5.": "Las comidas al día deben ser 3, 4 o 5.",
    "Meal split values must be whole numbers.": "Los porcentajes deben ser números enteros.",
    "The meal split must add up to 100%.": "Los porcentajes deben sumar 100 %.",
    # Gus
    "Gus couldn't reach his ideas right now. Try again in a moment.":
        "Gus no pudo pensar en ideas en este momento. Inténtelo de nuevo en un momento.",
    "Suggestions are not set up on this server.": "Las sugerencias no están configuradas en este servidor.",
    "Gus couldn't put together a complete meal that fits. Try again, or say what you'd like to use.":
        "Gus no pudo armar una comida completa que encaje. Inténtelo de nuevo o diga qué le gustaría usar.",
    "Gus couldn't put together a complete meal that fits. Try again, or take the photo with the foods more visible.":
        "Gus no pudo armar una comida completa que encaje. Inténtelo de nuevo o tome la foto con los alimentos más visibles.",
    # Reminders
    "Reminders aren't set up on the server yet.": "Los recordatorios aún no están configurados en el servidor.",
    "No phone could be reached. Turn reminders off and on again.":
        "No se pudo contactar ningún teléfono. Desactive y vuelva a activar los recordatorios.",
    # Garmin
    "Garmin isn't connected.": "Garmin no está conectado.",
    "Couldn't reach Garmin.": "No se pudo contactar a Garmin.",
    "Garmin didn't accept the API key.": "Garmin no aceptó la clave de API.",
    "Garmin returned an unexpected response.": "Garmin respondió algo inesperado.",
    "Garmin sign-in expired; try again.": "El inicio de sesión de Garmin venció; inténtelo de nuevo.",
    "Garmin sign-in returned no token.": "El inicio de sesión de Garmin no devolvió un token.",
    # Scanning
    "Scanning is not set up on this server.": "El escaneo no está configurado en este servidor.",
    "That barcode didn't read correctly. Try again.": "Ese código de barras no se leyó bien. Inténtelo de nuevo.",
    "That doesn't look like a product barcode.": "Eso no parece un código de barras de producto.",
    "The image could not be read.": "No se pudo leer la imagen.",
    "The image is empty.": "La imagen está vacía.",
    "The image is too large. Retake it or use a smaller photo.": "La imagen es muy grande. Tómela de nuevo o use una foto más pequeña.",
    "Unsupported image format. Use a JPEG, PNG, WEBP, or GIF photo.": "Formato de imagen no compatible. Use una foto JPEG, PNG, WEBP o GIF.",
    "Open Food Facts could not be reached.": "No se pudo contactar a Open Food Facts.",
    "Open Food Facts search returned an unexpected response.": "La búsqueda de Open Food Facts respondió algo inesperado.",
    "USDA search request failed.": "Falló la búsqueda en USDA.",
    "USDA search returned an invalid payload.": "La búsqueda en USDA devolvió datos no válidos.",
    "USDA search returned an unexpected food.": "La búsqueda en USDA devolvió un alimento inesperado.",
    "Accepted ingestion output does not contain food data.": "El escaneo aceptado no tiene datos del alimento.",
    "Accepted ingestion output has invalid macro data.": "El escaneo aceptado tiene macros no válidos.",
    "Accepted ingestion output is missing a product name.": "Al escaneo aceptado le falta el nombre del producto.",
    "Accepted outputs cannot be rejected.": "Un escaneo aceptado no se puede rechazar.",
    "Rejected outputs cannot be accepted.": "Un escaneo rechazado no se puede aceptar.",
    "Reviewed outputs cannot be reopened.": "Un escaneo revisado no se puede reabrir.",
    "Only accepted ingestion outputs can be saved as foods.": "Solo los escaneos aceptados se pueden guardar como alimentos.",
    "Unexpected ingestion error.": "Error inesperado al procesar el escaneo.",
    # Account and setup
    "No profile found for that email. Sign up instead.": "No hay un perfil con ese correo. Regístrese.",
    "That email already has a profile. Sign in instead.": "Ese correo ya tiene un perfil. Inicie sesión.",
    "User onboarding is already complete.": "La configuración ya está completa.",
    "Failed to reset the profile.": "No se pudo restablecer el perfil.",
    "That looks like the front of the package. Point at the Nutrition Facts panel instead.":
        "Eso parece el frente del empaque. Apunte a la tabla nutricional.",
    "Couldn't read that clearly. Hold the phone a little closer and steady, or take a full photo.":
        "No se pudo leer bien. Acerque un poco el teléfono y manténgalo quieto, o tome una foto completa.",
}

# Messages with values in them: (English pattern, Spanish with the same groups).
PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^Ask for at most (\d+) days, start before end\.$"), r"Pida como máximo \1 días, con el inicio antes del final."),
    (re.compile(r"^Give one percent for each of the (\d+) meals\.$"), r"Indique un porcentaje para cada una de las \1 comidas."),
    (re.compile(r"^(.+) needs at least (\d+)%, in steps of 5%\.$"), r"\1 necesita al menos \2 %, en pasos de 5 %."),
    (re.compile(r"^Garmin (activities|sign-in) failed \((\d+)\)\.$"), r"Garmin falló (\2)."),
    (re.compile(r"^Open Food Facts( search)? returned (\d+)\.$"), r"Open Food Facts respondió \2."),
    (re.compile(r"^USDA search failed with status (\d+)$"), r"La búsqueda en USDA falló (\1)."),
    (re.compile(r"^Matched to (.+) from (.+)\. Check it against the label, or scan the nutrition label for the exact numbers\.$"),
     r"Se asoció con \1 de \2. Compárelo con la etiqueta o escanee la tabla nutricional para tener los datos exactos."),
    (re.compile(r"^Profile recalculation requires: (.+)\.$"), r"Para recalcular el perfil falta: \1."),
]

# Meal names inside Spanish sentences: (with an article, "complete" agreeing with it).
_MEAL_PHRASES_ES = {
    "breakfast": ("un desayuno", "completo"),
    "lunch": ("un almuerzo", "completo"),
    "dinner": ("una cena", "completa"),
    "snack": ("un refrigerio", "completo"),
    "morning snack": ("una media mañana", "completa"),
    "afternoon snack": ("unas onces", "completas"),
}

_NO_ROOM = re.compile(
    r"^Only (\d+) kcal left today, so there isn't room for a (.+)\. A cup of tea, sparkling water, or some raw veg would fit\.$"
)
_INCOMPLETE = re.compile(r"^Gus couldn't put together a complete (.+) this time\. Try again\.$")


def translate(text: str | None, language: Language) -> str | None:
    """`text` in the language; unknown text comes back unchanged (English)."""
    if text is None or language == "en":
        return text
    if text in ES:
        return ES[text]
    match = _NO_ROOM.match(text)
    if match:
        meal, _ = _MEAL_PHRASES_ES.get(match.group(2).strip().lower(), (match.group(2), ""))
        return f"Solo le quedan {match.group(1)} kcal hoy, así que no hay espacio para {meal}. Un té, agua con gas o unas verduras crudas sí caben."
    match = _INCOMPLETE.match(text)
    if match:
        meal, complete = _MEAL_PHRASES_ES.get(match.group(1).strip().lower(), (match.group(1), "completo"))
        return f"Gus no pudo armar {meal} {complete} esta vez. Inténtelo de nuevo."
    for pattern, replacement in PATTERNS:
        if pattern.match(text):
            return pattern.sub(replacement, text)
    # "<problem>. <known message>": translate the known part (the scanner's unreadable note).
    for english, spanish in ES.items():
        if text.endswith(" " + english):
            return text[: -len(english)] + spanish
    return text
