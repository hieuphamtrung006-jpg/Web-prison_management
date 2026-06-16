from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.incident import Incident
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
    search: str | None = Query(default=None, min_length=1, max_length=100),
    type: str | None = Query(default=None, max_length=30),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[LocationOccupancyRead]:
    offset = (page - 1) * page_size

    # Build base query with occupancy join (always, for all roles that can list)
    q = db.query(
        Location.location_id,
        Location.location_name,
        Location.type,
        Location.capacity,
        Location.security_level,
        Location.is_active,
        func.count(Prisoner.prisoner_id).label("current_occupancy"),
    ).outerjoin(
        Prisoner,
        (Prisoner.current_location_id == Location.location_id)
        & (Prisoner.status != "Released"),
    )

    # Search by name (partial, case-insensitive) - matches frontend requirement
    if search:
        q = q.filter(Location.location_name.ilike(f"%{search}%"))

    # Filter by type if provided (e.g. Cell, Workshop, etc.)
    if type:
        q = q.filter(Location.type == type)

    rows = (
        q.group_by(
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
    # ensure created_at is set (DB has server_default but set here for immediate value)
    location.created_at = datetime.now(timezone.utc)
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

    update_data = payload.model_dump(exclude_unset=True)
    # If capacity is being reduced, ensure it is not less than current occupancy
    if "capacity" in update_data and update_data["capacity"] is not None:
        current_occupancy = (
            db.query(func.count(Prisoner.prisoner_id))
            .filter(Prisoner.current_location_id == location_id, Prisoner.status != "Released")
            .scalar()
        ) or 0
        if update_data["capacity"] < current_occupancy:
            raise HTTPException(
                status_code=400,
                detail=f"Capacity cannot be reduced below current occupancy ({current_occupancy})",
            )

    for field, value in update_data.items():
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

    # Count constraints precisely (do not delete if any exist)
    # Prisoners: only non-released (consistent with occupancy logic)
    prisoner_count = (
        db.query(func.count(Prisoner.prisoner_id))
        .filter(Prisoner.current_location_id == location_id, Prisoner.status != "Released")
        .scalar()
    ) or 0

    incident_count = (
        db.query(func.count(Incident.incident_id))
        .filter(Incident.location_id == location_id)
        .scalar()
    ) or 0

    project_count = (
        db.query(func.count(LaborProject.project_id))
        .filter(LaborProject.location_id == location_id)
        .scalar()
    ) or 0

    schedule_count = (
        db.query(func.count(Schedule.schedule_id))
        .filter(Schedule.location_id == location_id)
        .scalar()
    ) or 0

    constraints = []
    if prisoner_count > 0:
        constraints.append(f"- {prisoner_count} tù nhân đang cư trú")
    if incident_count > 0:
        constraints.append(f"- {incident_count} sự cố đã ghi nhận")
    if project_count > 0:
        constraints.append(f"- {project_count} dự án lao động đang sử dụng")
    if schedule_count > 0:
        constraints.append(f"- {schedule_count} lịch trình đang sử dụng vị trí này")

    if constraints:
        msg = (
            f"Không thể xóa Location '{location.location_name}' vì còn ràng buộc:\n"
            + "\n".join(constraints)
        )
        raise HTTPException(status_code=400, detail=msg)

    db.delete(location)
    db.commit()
    return MessageResponse(detail="Location deleted")
