from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings
from backend.app.routes.auth import router as auth_router
from backend.app.routes.health import router as health_router
from backend.app.routes.meals import router as meals_router
from backend.app.routes.nutrition import router as nutrition_router
from backend.app.routes.recipes import router as recipes_router
from backend.app.routes.vision import router as vision_router


def create_app() -> FastAPI:
    settings = get_settings()
    cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins or ["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(nutrition_router, prefix="/api")
    app.include_router(meals_router, prefix="/api")
    app.include_router(recipes_router, prefix="/api")
    app.include_router(vision_router, prefix="/api")
    return app


app = create_app()
