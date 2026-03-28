from backend.app.models.nutrition import IngredientInput, MacroTargets, MealInput, MealTotals


def round1(value: float) -> float:
    return round(value, 1)


def scale_macros(macros: MacroTargets, multiplier: float) -> MacroTargets:
    return MacroTargets(
        protein=round1(macros.protein * multiplier),
        carbs=round1(macros.carbs * multiplier),
        fat=round1(macros.fat * multiplier),
    )


def ingredient_totals(ingredient: IngredientInput) -> tuple[float, MacroTargets]:
    multiplier = ingredient.grams / 100
    calories = round1(ingredient.calories_per_100g * multiplier)
    macros = scale_macros(ingredient.macros_per_100g, multiplier)
    return calories, macros


def meal_totals(meal: MealInput) -> MealTotals:
    calories = 0.0
    protein = 0.0
    carbs = 0.0
    fat = 0.0

    for ingredient in meal.ingredients:
        ingredient_calories, ingredient_macros = ingredient_totals(ingredient)
        calories += ingredient_calories
        protein += ingredient_macros.protein
        carbs += ingredient_macros.carbs
        fat += ingredient_macros.fat

    total_macros = MacroTargets(
        protein=round1(protein),
        carbs=round1(carbs),
        fat=round1(fat),
    )

    return MealTotals(
        calories=round1(calories),
        macros=total_macros,
        per_serving_calories=round1(calories / meal.serving_count),
        per_serving_macros=MacroTargets(
            protein=round1(total_macros.protein / meal.serving_count),
            carbs=round1(total_macros.carbs / meal.serving_count),
            fat=round1(total_macros.fat / meal.serving_count),
        ),
    )
