"""The food bank and serving weights at the repository level."""

from backend.app.models.nutrition import FoodItem, FoodPortion, MacroTargets


def _food(food_id: str, **extra) -> FoodItem:
    base = dict(
        id=food_id, name=f"Food {food_id}", calories=100, serving_size=1, serving_unit="packet",
        macros=MacroTargets(protein=1, carbs=2, fat=3), source="LABEL_SCAN",
    )
    return FoodItem(**{**base, **extra})


def test_bank_add_list_and_remove(repository):
    repository.ensure_user_identity(user_id="u1", email="u1@example.com")
    repository.save_food_item(_food("a"))
    repository.save_food_item(_food("b"))
    repository.add_to_food_bank(user_id="u1", food_id="a")
    repository.add_to_food_bank(user_id="u1", food_id="b", used=True)
    repository.add_to_food_bank(user_id="u1", food_id="a")  # no duplicates

    bank = repository.list_food_bank("u1")
    assert [food.id for food in bank] == ["b", "a"]  # recently used first
    assert all(food.in_bank for food in bank)
    assert [food.id for food in repository.list_food_bank("u1", "food a")] == ["a"]
    assert repository.food_bank_ids("u1") == {"a", "b"}
    repository.add_to_food_bank(user_id="u1", food_id="b", used=True)
    assert repository.food_bank_use_counts("u1") == {"a": 0, "b": 2}

    assert repository.remove_from_food_bank(user_id="u1", food_id="a") is True
    assert repository.food_bank_ids("u1") == {"b"}
    assert repository.get_food_by_id("a") is not None  # still in the catalog


def test_serving_weight_is_stored_read_back_and_never_wiped(repository):
    saved = repository.save_food_item(
        _food(
            "pb", serving_size=2, serving_unit="tbsp", serving_text="2 tbsp (32 g)", serving_grams=32,
            serving_basis="g", portions=[FoodPortion(label="1 tbsp", grams=16)],
        )
    )
    assert (saved.serving_grams, saved.serving_basis, saved.serving_text) == (32, "g", "2 tbsp (32 g)")
    assert saved.portions == [FoodPortion(label="1 tbsp", grams=16)]

    # A re-save without a weight (e.g. a re-scan) keeps the known weight.
    resaved = repository.save_food_item(_food("pb", serving_size=2, serving_unit="tbsp"))
    assert resaved.serving_grams == 32

    weighed = repository.set_serving_weight(food_id="pb", serving_grams=33.5, serving_basis="g")
    assert weighed.serving_grams == 33.5


def test_older_rows_read_the_weight_out_of_the_unit(repository):
    # Before 005 the label weight sat inside the unit string.
    food = repository.save_food_item(_food("old", serving_size=2, serving_unit="tbsp (32 g)"))
    assert (food.serving_grams, food.serving_basis) == (32, "g")
    unknown = repository.save_food_item(_food("packet", serving_size=1, serving_unit="packet"))
    assert unknown.serving_grams is None


def test_a_new_serving_does_not_keep_the_old_weight(repository):
    # First saved per 100 g (weight 100); a later rescan has a per-packet serving with no weight.
    repository.save_food_item(_food("bar", serving_size=100, serving_unit="g", serving_grams=100, serving_basis="g"))
    rescanned = repository.save_food_item(_food("bar", serving_size=1, serving_unit="packet", calories=190))
    assert rescanned.serving_grams is None
    assert rescanned.calories == 190
