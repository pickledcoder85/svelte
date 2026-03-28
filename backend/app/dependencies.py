from fastapi import Request

from backend.app.repositories.sqlite import SQLiteRepository


async def get_repository(request: Request) -> SQLiteRepository:
    return request.app.state.repository
