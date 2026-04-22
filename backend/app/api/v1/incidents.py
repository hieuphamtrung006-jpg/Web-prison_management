from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.incident import Incident
from app.db.models.prisoner import Prisoner
from app.db.models.user import User

router = APIRouter()


class IncidentCreate(BaseModel):
    prisoner_id: int
    location_id: int | None = None
    incident_date: datetime
    incident_type: str | None = None
    severity: str | None = None
    penalty_points: int = 0
    description: str | None = None


@router.get("/")
def list_incidents(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[dict]:
    rows = db.query(Incident).order_by(Incident.incident_date.desc()).all()
    return jsonable_encoder(rows)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> dict:
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == payload.prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

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
    return jsonable_encoder(incident)
