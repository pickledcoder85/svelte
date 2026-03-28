from backend.app.models.nutrition import IngredientInput, MacroTargets, MealInput
from backend.app.services.nutrition import ingredient_totals, meal_totals


def test_ingredient_totals():
    ingredient = IngredientInput(
        id="ingredient-oats",
        food_id="food-oats",
        name="Rolled oats",
        grams=80,
        calories_per_100g=389,
        macros_per_100g=MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
    )

    calories, macros = ingredient_totals(ingredient)

    assert calories == 311.2
    assert macros.model_dump() == {"protein": 13.5, "carbs": 53.0, "fat": 5.5}


def test_meal_totals():
    meal = MealInput(
        id="meal-breakfast-bowl",
        name="Blueberry Protein Bowl",
        serving_count=2,
        ingredients=[
            IngredientInput(
                id="ingredient-oats",
                food_id="food-oats",
                name="Rolled oats",
                grams=80,
                calories_per_100g=389,
                macros_per_100g=MacroTargets(protein=16.9, carbs=66.3, fat=6.9),
            ),
            IngredientInput(
                id="ingredient-yogurt",
                food_id="food-greek-yogurt",
                name="Greek yogurt",
                grams=300,
                calories_per_100g=59,
                macros_per_100g=MacroTargets(protein=10.3, carbs=3.6, fat=0.4),
            ),
            IngredientInput(
                id="ingredient-blueberries",
                food_id="food-blueberries",
                name="Blueberries",
                grams=140,
                calories_per_100g=57,
                macros_per_100g=MacroTargets(protein=0.7, carbs=14.5, fat=0.3),
            ),
        ],
    )

    totals = meal_totals(meal)

    assert totals.calories == 567.0
    assert totals.per_serving_calories == 283.5
    assert totals.per_serving_macros.model_dump() == {
        "protein": 22.3,
        "carbs": 36.6,
        "fat": 3.4,
    }
