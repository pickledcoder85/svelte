"""Shopping lists: saved from a meal plan, ticked off in the store, deleted when done."""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.dependencies import get_repository, get_required_session
from backend.app.repositories.sqlite import SQLiteRepository

router = APIRouter(prefix="/shopping-lists", tags=["shopping"])
Role = Literal["protein", "carb", "veg", "fruit", "fat", "other"]


class ShoppingItemInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    amount: str = Field(default="", max_length=80)
    role: Role = "other"


class ShoppingListCreate(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    items: list[ShoppingItemInput] = Field(default_factory=list, max_length=200)


class ShoppingItem(BaseModel):
    id: str
    name: str
    amount: str
    role: str
    checked: bool
    position: int


class ShoppingList(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    items: list[ShoppingItem]


class ShoppingListSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    total: int
    remaining: int


class CheckUpdate(BaseModel):
    checked: bool


def _list_or_404(repository: SQLiteRepository, user_id: str, list_id: str) -> ShoppingList:
    found = repository.get_shopping_list(user_id, list_id)
    if found is None:
        raise HTTPException(status_code=404, detail="That shopping list is gone.")
    return ShoppingList.model_validate(found)


@router.get("", response_model=list[ShoppingListSummary])
async def read_lists(session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)):
    return [ShoppingListSummary.model_validate(row) for row in repository.list_shopping_lists(session.user_id)]


@router.post("", response_model=ShoppingList)
async def create_list(payload: ShoppingListCreate, session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)):
    list_id = repository.create_shopping_list(
        user_id=session.user_id, title=payload.title.strip(), items=[item.model_dump() for item in payload.items]
    )
    return _list_or_404(repository, session.user_id, list_id)


@router.get("/{list_id}", response_model=ShoppingList)
async def read_list(list_id: str, session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)):
    return _list_or_404(repository, session.user_id, list_id)


@router.patch("/{list_id}/items/{item_id}", response_model=ShoppingList)
async def check_item(
    list_id: str, item_id: str, payload: CheckUpdate,
    session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository),
):
    if not repository.set_shopping_item_checked(user_id=session.user_id, list_id=list_id, item_id=item_id, checked=payload.checked):
        raise HTTPException(status_code=404, detail="That item is gone.")
    return _list_or_404(repository, session.user_id, list_id)


@router.post("/{list_id}/items", response_model=ShoppingList)
async def add_item(
    list_id: str, payload: ShoppingItemInput,
    session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository),
):
    if not repository.add_shopping_item(
        user_id=session.user_id, list_id=list_id, name=payload.name.strip(), amount=payload.amount.strip(), role=payload.role
    ):
        raise HTTPException(status_code=404, detail="That shopping list is gone.")
    return _list_or_404(repository, session.user_id, list_id)


@router.delete("/{list_id}", status_code=204)
async def delete_list(list_id: str, session = Depends(get_required_session), repository: SQLiteRepository = Depends(get_repository)) -> None:
    if not repository.delete_shopping_list(user_id=session.user_id, list_id=list_id):
        raise HTTPException(status_code=404, detail="That shopping list is gone.")
