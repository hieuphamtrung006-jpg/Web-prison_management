from fastapi import APIRouter

from app.api.v1 import (
	auth,
	incidents,
	labor,
	locations,
	prisoners,
	schedules,
	shifts,
	users,
	visits,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(prisoners.router, prefix="/prisoners", tags=["prisoners"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(visits.router, prefix="/visits", tags=["visits"])
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_router.include_router(labor.router, prefix="/labor", tags=["labor"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["shifts"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
