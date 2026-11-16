"""Counted foods: one item's weight from USDA measures, whole counts, and labels."""

import pytest

from backend.app.models.nutrition import FoodItem, FoodPortion, MacroTargets
from backend.app.services.meal_suggest import Nutrition, _assemble, _per_gram, clean_ingredients
from backend.app.services.portions import plural, quantity_label, round_count, unit_weight


def _food(name, calories_per_100, portions=(), protein=0.0):
    return FoodItem(
        id=f"usda-{name}", name=name, calories=calories_per_100, serving_size=100, serving_unit="g", serving_grams=100,
        macros=MacroTargets(protein=protein, carbs=0, fat=0), source="USDA",
        portions=[FoodPortion(label=label, grams=grams) for label, grams in portions],
    )


EGG = _food("Egg, whole, boiled or poached", 155, [("1 egg", 50), ("1 slice", 5), ("1 cup", 135)], protein=12.6)
SWEET_POTATO = _food("Sweet potato, baked, no added fat", 90, [("1 medium", 150), ("1 cup, mashed", 250), ("1 oz, raw, yields", 25),
                                                                ("1 large", 235), ("1 small", 80)])
APPLE = _food("Apple, raw", 52, [("1 small", 165), ("1 single serving package", 34), ("1 slice", 25), ("1 medium", 200),
                                 ("1 extra large", 295)])
BANANA = _food("Banana, raw", 89, [("1 cup, mashed", 225), ("1 banana", 126), ("1 slice", 6), ("1 linear inch", 15)])
BREAD = _food("Bread, whole wheat", 250, [("1 slice, snack-size", 10), ("1 large or thick slice", 43), ("1 cubic inch", 3.2),
                                          ("1 medium or regular slice", 36), ("1 small or thin/very thin slice", 24)])


@pytest.mark.parametrize(
    "food, unit, name, grams",
    [
        (EGG, "large egg", "eggs", 50),  # "1 egg", never "1 slice" (5 g) or a cup
        (SWEET_POTATO, "medium sweet potato", "sweet potato", 150),
        (SWEET_POTATO, "large sweet potato", "sweet potato", 235),  # the size Gus gave
        (SWEET_POTATO, "sweet potato", "sweet potato", 150),  # no size: medium
        (APPLE, "apple", "apple", 200),  # medium, never a slice or a package
        (BANANA, "banana", "banana", 126),
        (BREAD, "slice of whole wheat bread", "whole wheat bread", 36),  # a regular slice, not snack-size
        (BREAD, "thin slice of bread", "bread", 36),
        (_food("Bananas, raw", 89), "banana", "banana", None),  # no measures (SR Legacy)
    ],
)
def test_one_items_weight_comes_from_usda_measures(food, unit, name, grams):
    assert unit_weight(food, unit, name) == grams


def test_counts_stay_whole_and_big_items_can_be_halved():
    assert round_count(2.4, 50) == 2
    assert round_count(0.3, 50) == 1  # never none
    assert round_count(1.3, 150) == 1.5
    assert round_count(0.2, 150) == 0.5


@pytest.mark.parametrize(
    "unit, expected",
    [("large egg", "large eggs"), ("medium sweet potato", "medium sweet potatoes"), ("slice of whole wheat bread", "slices of whole wheat bread"),
     ("peach", "peaches"), ("medium strawberry", "medium strawberries"), ("tortilla", "tortillas")],
)
def test_plurals(unit, expected):
    assert plural(unit) == expected


def test_labels():
    assert quantity_label(100, 2, "large egg") == "2 large eggs (100 g)"
    assert quantity_label(150, 1, "medium sweet potato") == "1 medium sweet potato (150 g)"
    assert quantity_label(75, 0.5, "medium sweet potato") == "½ medium sweet potato (75 g)"
    assert quantity_label(225, 1.5, "medium sweet potato") == "1½ medium sweet potatoes (225 g)"
    assert quantity_label(152.4) == "152 g"


def test_ingredients_keep_a_count_only_with_a_unit():
    items = clean_ingredients([
        {"name": "eggs", "grams": 100, "count": 2, "unit": "large egg", "role": "protein"},
        {"name": "rice", "grams": 150, "count": 0, "unit": "", "role": "carb"},
        {"name": "apple", "grams": 180, "count": 1, "unit": "", "role": "fruit"},
        {"name": "toast", "grams": 72, "count": 99, "unit": "slice", "role": "carb"},
        {"name": "banana", "grams": 120, "count": "two", "unit": "banana", "role": "fruit"},
    ])
    assert [(item["count"], item["unit"]) for item in items] == [(2, "large egg"), (None, None), (None, None), (None, None), (None, None)]


def _found(name, food, grams, role, count=None, unit=None):
    return {"name": name, "query": name, "grams": grams, "role": role, "count": count, "unit": unit, "food": food, "rate": _per_gram(food)}


def test_a_meal_keeps_counted_foods_whole_and_the_rest_flexes():
    oats = _food("Oats, cooked", 71, protein=2.5)
    found = [_found("eggs", EGG, 110, "protein", 2, "large egg"), _found("oats", oats, 200, "carb")]
    meal = _assemble({"name": "Eggs and oats", "why": ""}, found, Nutrition(calories=500, protein=25, carbs=50, fat=15))
    eggs, oatmeal = meal.items
    assert eggs.count == eggs.grams / 50 and eggs.count == int(eggs.count)  # whole eggs, 50 g each
    assert eggs.quantity_label == f"{int(eggs.count)} large eggs ({int(eggs.grams)} g)"
    assert eggs.unit_plural == "large eggs"
    assert oatmeal.count is None and oatmeal.quantity_label == f"{round(oatmeal.grams)} g"
    assert abs(meal.totals.calories - 500) <= 60  # the oats made up the difference


def test_without_usda_measures_gus_grams_set_one_items_weight():
    bananas = _food("Bananas, raw", 89)
    meal = _assemble({"name": "Banana", "why": ""}, [_found("banana", bananas, 240, "fruit", 2, "banana")], Nutrition(calories=214))
    assert meal.items[0].count == 2 and meal.items[0].grams == 240
    assert meal.items[0].quantity_label == "2 bananas (240 g)"


TOMATO = _food("Tomatoes, red, ripe, raw", 18, [("1 large whole (3\" dia)", 182), ("1 medium whole (2-3/5\" dia)", 123),
                                                ("1 plum tomato", 62), ("1 cherry tomato", 17), ("1 small whole (2-2/5\" dia)", 91)])
RAW_EGG = _food("Egg, whole, raw, fresh", 143, [("1 large", 50), ("1 extra large", 56), ("1 jumbo", 63), ("1 medium", 44)])
BANANAS = _food("Bananas, raw", 89, [("1 extra small (less than 6\" long)", 81), ("1 small (6\" to 6-7/8\" long)", 101),
                                     ("1 medium (7\" to 7-7/8\" long)", 118), ("1 large (8\" to 8-7/8\" long)", 136)])


@pytest.mark.parametrize(
    "food, unit, name, grams",
    [
        (TOMATO, "cherry tomato", "cherry tomatoes", 17),  # the variety asked for, never a plum tomato
        (TOMATO, "medium tomato", "tomato", 123),
        (TOMATO, "tomato", "tomato", 123),
        (RAW_EGG, "extra large egg", "eggs", 56),  # not "1 large"
        (RAW_EGG, "large egg", "eggs", 50),
        (BANANAS, "small banana", "banana", 101),  # not "1 extra small"
        (BANANAS, "banana", "banana", 118),
    ],
)
def test_sizes_and_varieties_are_matched_exactly(food, unit, name, grams):
    assert unit_weight(food, unit, name) == grams


def test_counts_never_pass_the_limit():
    berries = _food("Strawberries, raw", 32, [("1 medium", 12)])
    yogurt = _food("Yogurt, Greek", 61, protein=10)
    found = [_found("strawberries", berries, 144, "fruit", 12, "medium strawberry"), _found("yogurt", yogurt, 200, "protein")]
    meal = _assemble({"name": "Berries", "why": ""}, found, Nutrition(calories=600, protein=40))
    assert meal.items[0].count <= 24 and meal.items[0].grams == meal.items[0].count * 12
