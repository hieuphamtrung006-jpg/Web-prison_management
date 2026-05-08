from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.labor import LaborProject
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.schedule import Schedule
from app.db.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.location import LocationCreate, LocationOccupancyRead, LocationRead, LocationUpdate

router = APIRouter()


@router.get("/", response_model=list[LocationOccupancyRead])
def list_locations(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[LocationOccupancyRead]:
    offset = (page - 1) * page_size
    rows = (
        db.query(
            Location.location_id,
            Location.location_name,
            Location.type,
            Location.capacity,
            Location.security_level,
            Location.is_active,
            func.count(Prisoner.prisoner_id).label("current_occupancy"),
        )
        .outerjoin(
            Prisoner,
            (Prisoner.current_location_id == Location.location_id)
            & (Prisoner.status != "Released"),
        )
        .group_by(
            Location.location_id,
            Location.location_name,
            Location.type,
            Location.capacity,
            Location.security_level,
            Location.is_active,
        )
        .order_by(Location.location_id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [LocationOccupancyRead(**dict(row._mapping)) for row in rows]


@router.get("/{location_id}", response_model=LocationRead)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> LocationRead:
    location = db.query(Location).filter(Location.location_id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationRead.model_validate(location)


@router.post("/", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> LocationRead:
    location = Location(**payload.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return LocationRead.model_validate(location)


@router.put("/{location_id}", response_model=LocationRead)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> LocationRead:
    location = db.query(Location).filter(Location.location_id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(location, field, value)
    location.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(location)
    return LocationRead.model_validate(location)


@router.delete("/{location_id}", response_model=MessageResponse)
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> MessageResponse:
    location = db.query(Location).filter(Location.location_id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    has_prisoners = (
        db.query(Prisoner.prisoner_id)
        .filter(Prisoner.current_location_id == location_id, Prisoner.status != "Released")
        .first()
    )
    has_projects = db.query(LaborProject.project_id).filter(LaborProject.location_id == location_id).first()
    has_schedules = db.query(Schedule.schedule_id).filter(Schedule.location_id == location_id).first()
    if has_prisoners or has_projects or has_schedules:
        raise HTTPException(status_code=400, detail="Location has related records and cannot be deleted")

    db.delete(location)
    db.commit()
    return MessageResponse(detail="Location deleted")
