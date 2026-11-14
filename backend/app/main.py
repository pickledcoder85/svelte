from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import Settings, get_settings
from backend.app.dependencies import get_required_session
from backend.app.db.database import resolve_sqlite_path
from backend.app.routes.auth import router as auth_router
from backend.app.routes.ingestion import router as ingestion_router
from backend.app.routes.food_logs import router as food_logs_router
from backend.app.routes.health import router as health_router
from backend.app.routes.meals import router as meals_router
from backend.app.routes.nutrition import router as nutrition_router
from backend.app.routes.profile import router as profile_router
from backend.app.routes.recipes import router as recipes_router
from backend.app.routes.tracker import router as tracker_router
from backend.app.routes.vision import router as vision_router
from backend.app.repositories.sqlite import SQLiteRepository

def create_app(
    database_path: str | None = None,
    database_url: str | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    settings.validate_startup()
    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    db_path = database_path or resolve_sqlite_path(database_url or settings.database_url)
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        # The interactive API docs describe every route; keep them off the deployed server.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    app.state.settings = settings
    app.state.repository = SQLiteRepository(db_path)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Only /api/health and /api/auth are open; every other route requires the owner session.
    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    owner_only = [Depends(get_required_session)]
    for router in (
        nutrition_router,
        profile_router,
        food_logs_router,
        ingestion_router,
        meals_router,
        recipes_router,
        tracker_router,
        vision_router,
    ):
        app.include_router(router, prefix="/api", dependencies=owner_only)
    return app


app = create_app()
