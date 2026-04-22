from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import cast
from sqlalchemy import Date as SQLDate
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.user import User
from app.db.models.visit import Visit

router = APIRouter()


class VisitCreate(BaseModel):
    prisoner_id: int
    visitor_name: str
    visit_date: datetime
    notes: str | None = None


@router.get("/")
def list_visits(
    status_filter: str = "Pending",
    today_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[dict]:
    query = db.query(Visit).filter(Visit.status == status_filter)
    if today_only:
        query = query.filter(cast(Visit.visit_date, SQLDate) == date.today())
    return jsonable_encoder(query.order_by(Visit.visit_date.asc()).all())


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_visit(
    payload: VisitCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> dict:
    visit = Visit(
        prisoner_id=payload.prisoner_id,
        visitor_name=payload.visitor_name,
        visit_date=payload.visit_date,
        status="Pending",
        notes=payload.notes,
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return jsonable_encoder(visit)


@router.put("/{visit_id}/approve")
def approve_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden")),
) -> dict:
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    visit.status = "Approved"
    visit.approved_by = current_user.user_id
    visit.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(visit)
    return jsonable_encoder(visit)
