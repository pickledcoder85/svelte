import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from backend.app.config import Settings, get_settings
from backend.app.dependencies import get_required_session
from backend.app.db.backup import backup_database
from backend.app.db.database import resolve_sqlite_path
from backend.app.routes.auth import router as auth_router
from backend.app.routes.export import router as export_router
from backend.app.routes.ingestion import router as ingestion_router
from backend.app.routes.food_logs import router as food_logs_router
from backend.app.routes.health import router as health_router
from backend.app.routes.integrations import router as integrations_router
from backend.app.routes.meals import router as meals_router
from backend.app.routes.nutrition import router as nutrition_router
from backend.app.routes.profile import router as profile_router
from backend.app.routes.recipes import router as recipes_router
from backend.app.routes.tracker import router as tracker_router
from backend.app.routes.vision import router as vision_router
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.garmin_sync import garmin_configured, run_background_sync
from backend.app.web import mount_web_app, validate_web_dist

def create_app(
    database_path: str | None = None,
    database_url: str | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    settings.validate_startup()
    if settings.web_dist_dir.strip():
        validate_web_dist(settings.web_dist_dir)
    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    db_path = database_path or resolve_sqlite_path(database_url or settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = None
        if settings.garmin_background_sync and garmin_configured(settings) and settings.owner_email.strip():
            task = asyncio.create_task(run_background_sync(app.state.repository, settings))
        yield
        if task is not None:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    app = FastAPI(
        lifespan=lifespan,
        title=settings.app_name,
        version="0.1.0",
        # The interactive API docs describe every route; keep them off the deployed server.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    app.state.settings = settings
    if settings.backup_dir.strip():
        backup_database(db_path, settings.backup_dir, keep=settings.backup_keep, label="startup")
    app.state.repository = SQLiteRepository(db_path)

    # Compress responses (the web bundle shrinks from ~890 KB to ~240 KB); Tailscale Serve
    # passes responses through without compressing them.
    app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=6)

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
        export_router,
        integrations_router,
    ):
        app.include_router(router, prefix="/api", dependencies=owner_only)

    @app.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-Frame-Options", "DENY")
        if request.url.path.startswith("/api/"):
            # API responses carry personal data; never let the browser or a proxy cache them.
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    # Last: the web app's catch-all route must not shadow any API route.
    if settings.web_dist_dir.strip():
        mount_web_app(app, settings.web_dist_dir)
    return app

