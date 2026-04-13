from fastapi import APIRouter

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.incidents import router as incidents_router
from app.api.v1.endpoints.prisoners import router as prisoners_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(prisoners_router)
api_v1_router.include_router(incidents_router)

