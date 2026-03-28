from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings
from backend.app.routes.health import router as health_router
from backend.app.routes.nutrition import router as nutrition_router
from backend.app.routes.recipes import router as recipes_router
from backend.app.routes.vision import router as vision_router


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(nutrition_router, prefix="/api")
app.include_router(recipes_router, prefix="/api")
app.include_router(vision_router, prefix="/api")
