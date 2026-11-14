from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from backend.app.dependencies import get_repository, get_required_session
from backend.app.repositories.sqlite import SQLiteRepository
from backend.app.services.export import build_user_export

router = APIRouter(tags=["export"])


@router.get("/export")
async def export_data(
    session=Depends(get_required_session),
    repository: SQLiteRepository = Depends(get_repository),
) -> JSONResponse:
    filename = f"relish-export-{datetime.now(UTC).date().isoformat()}.json"
    return JSONResponse(
        build_user_export(repository, session.user_id),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
