from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.labor import LaborAssignment, LaborProject
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.user import User
from app.schemas.prisoner import PrisonerCreate, PrisonerDetail, PrisonerRead, PrisonerUpdate

router = APIRouter()


@router.get("/")
def list_prisoners(
    name: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    location_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[PrisonerRead]:
    query = db.query(Prisoner)
    if name:
        query = query.filter(Prisoner.full_name.ilike(f"%{name}%"))
    if risk_level:
        query = query.filter(Prisoner.risk_level == risk_level)
    if location_id is not None:
        query = query.filter(Prisoner.current_location_id == location_id)
    return query.order_by(Prisoner.prisoner_id.desc()).all()


@router.post("/", response_model=PrisonerRead, status_code=status.HTTP_201_CREATED)
def create_prisoner(
    payload: PrisonerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> Prisoner:
    if payload.current_location_id is not None:
        location = db.query(Location).filter(Location.location_id == payload.current_location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        occupancy = (
            db.query(func.count(Prisoner.prisoner_id))
            .filter(
                Prisoner.current_location_id == payload.current_location_id,
                Prisoner.status != "Released",
            )
            .scalar()
        )
        if occupancy >= location.capacity:
            raise HTTPException(status_code=400, detail="Location is at full capacity")

    prisoner = Prisoner(**payload.model_dump())
    db.add(prisoner)
    db.commit()
    db.refresh(prisoner)
    return prisoner


@router.get("/{prisoner_id}", response_model=PrisonerDetail)
def get_prisoner(
    prisoner_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> PrisonerDetail:
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

    location_name = (
        db.query(Location.location_name)
        .filter(Location.location_id == prisoner.current_location_id)
        .scalar()
    )
    projects = (
        db.query(LaborProject.project_name)
        .join(LaborAssignment, LaborAssignment.project_id == LaborProject.project_id)
        .filter(LaborAssignment.prisoner_id == prisoner_id)
        .distinct()
        .all()
    )

    return PrisonerDetail(
        **prisoner.__dict__,
        current_location_name=location_name,
        projects=[name for (name,) in projects],
    )


@router.put("/{prisoner_id}", response_model=PrisonerRead)
def update_prisoner(
    prisoner_id: int,
    payload: PrisonerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> Prisoner:
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

    data = payload.model_dump(exclude_unset=True)
    new_location_id = data.get("current_location_id")
    if new_location_id is not None and new_location_id != prisoner.current_location_id:
        location = db.query(Location).filter(Location.location_id == new_location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        occupancy = (
            db.query(func.count(Prisoner.prisoner_id))
            .filter(
                Prisoner.current_location_id == new_location_id,
                Prisoner.status != "Released",
                Prisoner.prisoner_id != prisoner_id,
            )
            .scalar()
        )
        if occupancy >= location.capacity:
            raise HTTPException(status_code=400, detail="Location is at full capacity")

    for field, value in data.items():
        setattr(prisoner, field, value)
    prisoner.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(prisoner)
    return prisoner


@router.delete("/{prisoner_id}")
def release_prisoner(
    prisoner_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> dict[str, str]:
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

    prisoner.status = "Released"
    prisoner.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"detail": "Prisoner released"}
