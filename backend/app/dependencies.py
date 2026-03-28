from fastapi import Request

from backend.app.repositories.sqlite import SQLiteRepository


def get_repository(request: Request) -> SQLiteRepository:
    return request.app.state.repository
