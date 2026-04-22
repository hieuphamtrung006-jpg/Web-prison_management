from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.supabase import get_supabase_admin
from app.db.session import check_db_connection

app = FastAPI(title="Prison Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Backend is running"}


@app.get("/health")
def health() -> dict:
    db_ok = check_db_connection()
    supabase_ready = bool(get_supabase_admin())

    return {
        "app": "ok",
        "database": "ok" if db_ok else "error",
        "supabase": "configured" if supabase_ready else "not_configured",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
