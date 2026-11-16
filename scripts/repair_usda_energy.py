"""Repair USDA foods saved with kilojoules as kcal (fixed 2026-11-16).

Before the fix, Relish read the first USDA nutrient named "Energy", which is sometimes the kJ
value. This re-fetches every saved USDA food by its FoodData Central ID, reads energy by nutrient
number (208 = kcal; 268 = kJ, converted), and corrects the stored calories (per serving: the
per-100 g value scaled by the saved serving weight). Logged days that used a corrected food are
listed too, so they can be reviewed.

Usage (on the server, with the app's environment):
    python -m scripts.repair_usda_energy            # dry run: show what would change
    python -m scripts.repair_usda_energy --apply    # write the corrections
"""
from __future__ import annotations

import argparse
import sqlite3
import sys

import httpx

from backend.app.config import get_settings

FOODS_URL = "https://api.nal.usda.gov/fdc/v1/foods"
BATCH = 20


def kcal_per_100(food: dict) -> float | None:
    kcal = kj = None
    for nutrient in food.get("foodNutrients") or []:
        number = str(nutrient.get("number") or nutrient.get("nutrientNumber") or "")
        unit = str(nutrient.get("unitName") or "").lower()
        amount = nutrient.get("amount", nutrient.get("value"))
        if amount is None:
            continue
        if number == "208" or (unit == "kcal" and str(nutrient.get("name", "")).startswith("Energy")):
            kcal = float(amount)
        elif number == "268" or unit == "kj":
            kj = float(amount)
    if kcal is not None:
        return kcal
    return kj / 4.184 if kj is not None else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--apply", action="store_true", help="write the corrections (default: dry run)")
    args = parser.parse_args()
    settings = get_settings()
    if not settings.usda_api_key:
        print("USDA_API_KEY is not set.", file=sys.stderr)
        return 1
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        "SELECT id, name, calories, serving_grams FROM food_catalog WHERE source = 'USDA' AND id LIKE 'usda-%'"
    ).fetchall()
    by_fdc = {row["id"].removeprefix("usda-"): row for row in rows}
    changes = []
    ids = list(by_fdc)
    with httpx.Client(timeout=20) as client:
        for start in range(0, len(ids), BATCH):
            batch = ids[start : start + BATCH]
            response = client.get(
                FOODS_URL,
                params={"fdcIds": ",".join(batch), "format": "abridged", "nutrients": "208,268", "api_key": settings.usda_api_key},
            )
            response.raise_for_status()
            for food in response.json():
                row = by_fdc.get(str(food.get("fdcId")))
                per_100 = kcal_per_100(food)
                if row is None or per_100 is None:
                    continue
                correct = round(per_100 * (row["serving_grams"] or 100) / 100, 3)
                if abs(correct - row["calories"]) > max(0.5, row["calories"] * 0.01):
                    changes.append((row["id"], row["name"], row["calories"], correct))
    print(f"Checked {len(rows)} USDA foods; {len(changes)} need correcting.")
    for food_id, name, old, new in changes:
        logged = connection.execute("SELECT COUNT(*) FROM food_log_entries WHERE food_item_id = ?", (food_id,)).fetchone()[0]
        print(f"  {name}: {old:g} -> {new:g} kcal" + (f"  (logged {logged}x)" if logged else ""))
    if args.apply and changes:
        with connection:
            connection.executemany("UPDATE food_catalog SET calories = ? WHERE id = ?", [(new, food_id) for food_id, _, _, new in changes])
        print("Applied.")
    elif changes:
        print("Dry run: nothing written. Re-run with --apply.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
