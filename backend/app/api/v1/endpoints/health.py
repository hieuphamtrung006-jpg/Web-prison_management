from fastapi import APIRouter

from app.core.config import get_settings
from app.db.supabase import get_supabase_client

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readiness")
def readiness_check() -> dict[str, str | bool]:
    settings = get_settings()
    supabase_configured = get_supabase_client() is not None
    return {
        "status": "ready" if supabase_configured or settings.environment != "production" else "degraded",
        "environment": settings.environment,
        "supabase_configured": supabase_configured,
    }
