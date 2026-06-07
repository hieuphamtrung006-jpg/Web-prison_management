from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.audit import get_audit_context
from app.core.deps import get_db, require_roles
from app.db.models.user import User
from app.db.models.incident import Incident
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate

router = APIRouter()


@router.get("/", response_model=list[IncidentRead])
def list_incidents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[IncidentRead]:
    offset = (page - 1) * page_size
    rows = (
        db.query(Incident)
        .order_by(Incident.incident_id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [IncidentRead.model_validate(row) for row in rows]


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> IncidentRead:
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return IncidentRead.model_validate(incident)


@router.post("/", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_audit_context),  # Sets context + provides user for created_by
) -> IncidentRead:
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == payload.prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

    if payload.location_id is not None:
        location = db.query(Location).filter(Location.location_id == payload.location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

    incident = Incident(
        prisoner_id=payload.prisoner_id,
        location_id=payload.location_id,
        incident_date=payload.incident_date,
        incident_type=payload.incident_type,
        severity=payload.severity,
        penalty_points=payload.penalty_points,
        description=payload.description,
        created_by=current_user.user_id,
    )
    db.add(incident)

    if payload.severity == "High":
        prisoner.risk_level = "High"
        prisoner.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)
    return IncidentRead.model_validate(incident)


@router.put("/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_audit_context),  # Sets context for UPDATE
) -> IncidentRead:
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    data = payload.model_dump(exclude_unset=True)
    if "prisoner_id" in data:
        prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == data["prisoner_id"]).first()
        if not prisoner:
            raise HTTPException(status_code=404, detail="Prisoner not found")

    if "location_id" in data and data["location_id"] is not None:
        location = db.query(Location).filter(Location.location_id == data["location_id"]).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

    for field, value in data.items():
        setattr(incident, field, value)

    if data.get("severity") == "High":
        prisoner_id = data.get("prisoner_id", incident.prisoner_id)
        prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == prisoner_id).first()
        if prisoner:
            prisoner.risk_level = "High"
            prisoner.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)
    return IncidentRead.model_validate(incident)


@router.delete("/{incident_id}", response_model=MessageResponse)
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_audit_context),  # Sets context for DELETE
) -> MessageResponse:
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    db.delete(incident)
    db.commit()
    return MessageResponse(detail="Incident deleted")
