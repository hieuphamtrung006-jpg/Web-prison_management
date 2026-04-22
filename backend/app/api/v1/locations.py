from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.user import User

router = APIRouter()


@router.get("/")
def list_locations(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[dict]:
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
        .order_by(Location.location_id)
        .all()
    )
    return [dict(row._mapping) for row in rows]


class LocationCreate(BaseModel):
    location_name: str
    type: str | None = None
    capacity: int
    security_level: str | None = None
    is_active: bool = True


class LocationUpdate(BaseModel):
    location_name: str | None = None
    type: str | None = None
    capacity: int | None = None
    security_level: str | None = None
    is_active: bool | None = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> dict:
    location = Location(**payload.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return jsonable_encoder(location)


@router.put("/{location_id}")
def update_location(
    location_id: int,
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> dict:
    location = db.query(Location).filter(Location.location_id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(location, field, value)
    location.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(location)
    return jsonable_encoder(location)
