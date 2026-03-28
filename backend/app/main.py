from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings
from backend.app.routes.auth import router as auth_router
from backend.app.routes.ingestion import router as ingestion_router
from backend.app.routes.food_logs import router as food_logs_router
from backend.app.routes.health import router as health_router
from backend.app.routes.meals import router as meals_router
from backend.app.routes.nutrition import router as nutrition_router
from backend.app.routes.recipes import router as recipes_router
from backend.app.routes.tracker import router as tracker_router
from backend.app.routes.vision import router as vision_router
from backend.app.repositories.sqlite import SQLiteRepository


def create_app(database_path: str | None = None) -> FastAPI:
    settings = get_settings()
    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    db_path = database_path or settings.database_path
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.state.repository = SQLiteRepository(db_path)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(nutrition_router, prefix="/api")
    app.include_router(food_logs_router, prefix="/api")
    app.include_router(ingestion_router, prefix="/api")
    app.include_router(meals_router, prefix="/api")
    app.include_router(recipes_router, prefix="/api")
    app.include_router(tracker_router, prefix="/api")
    app.include_router(vision_router, prefix="/api")
    return app


app = create_app()
