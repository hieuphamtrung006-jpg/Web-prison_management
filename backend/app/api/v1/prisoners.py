from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, cast, Date as SQLDate
from sqlalchemy.orm import Session

from fastapi import Request

from app.core.audit import set_audit_context
from app.core.deps import get_db, require_roles
from app.core.security import execute_viewer_query, get_table_name_for_role
from app.db.models.user import User
from app.db.models.incident import Incident
from app.db.models.labor import DailyPerformance, LaborAssignment, LaborProject
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.schedule import Schedule
from app.db.models.user import User
from app.db.models.visit import Visit
from app.db.models.visit_request import VisitRequest
from app.schemas.common import MessageResponse
from app.schemas.prisoner import (
    PrisonerCreate,
    PrisonerDetail,
    PrisonerRead,
    PrisonerReadBasic,
    PrisonerUpdate,
)



router = APIRouter()

GUARD_EDITABLE_FIELDS = {"full_name", "gender", "crime_type", "risk_level", "rehab_hours"}


def _get_location_occupancy(db: Session, location_id: int, exclude_prisoner_id: int | None = None) -> int:
    query = db.query(func.count(Prisoner.prisoner_id)).filter(
        Prisoner.current_location_id == location_id,
        Prisoner.status != "Released",
    )
    if exclude_prisoner_id is not None:
        query = query.filter(Prisoner.prisoner_id != exclude_prisoner_id)
    return query.scalar() or 0


def _ensure_location_capacity(db: Session, location_id: int, exclude_prisoner_id: int | None = None) -> None:
    location = db.query(Location).filter(Location.location_id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    occupancy = _get_location_occupancy(db, location_id, exclude_prisoner_id=exclude_prisoner_id)
    if occupancy >= location.capacity:
        raise HTTPException(status_code=400, detail="Location is at full capacity")


@router.get("/", response_model=list[PrisonerRead] | list[PrisonerReadBasic])
def list_prisoners(
    name: str | None = Query(default=None, min_length=1, max_length=100),
    risk_level: str | None = Query(default=None, max_length=20),
    location_id: int | None = Query(default=None),
    prisoner_id: int | None = Query(default=None, gt=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[PrisonerRead] | list[PrisonerReadBasic]:
    """
    List prisoners.
    - Admin/Warden/Guard: query trực tiếp bảng Prisoners (full data).
    - Viewer: query View vw_Prisoners_Basic (dữ liệu đã được lọc ở DB level).
    """
    table_name = get_table_name_for_role("Prisoners", current_user.role)

    offset = (page - 1) * page_size

    if table_name.startswith("vw_"):
        # Viewer: dùng raw query trên View thông qua helper chung (giảm lặp code)
        conditions = []
        params = {"offset": offset, "limit": page_size}

        if name:
            conditions.append("FullName LIKE :name")
            params["name"] = f"%{name}%"
        if risk_level:
            conditions.append("RiskLevel = :risk_level")
            params["risk_level"] = risk_level
        if location_id is not None:
            conditions.append("CurrentLocationID = :location_id")
            params["location_id"] = location_id
        if prisoner_id is not None:
            conditions.append("PrisonerID = :prisoner_id")
            params["prisoner_id"] = prisoner_id

        where_clause = " AND ".join(conditions) if conditions else ""
        order_by = "ORDER BY PrisonerID DESC"
        limit_clause = "OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY"

        normalized_rows = execute_viewer_query(
            db,
            table_name,
            where_clause=where_clause,
            params=params,
            order_by=order_by,
            limit_clause=limit_clause,
        )
        return [PrisonerReadBasic.model_validate(row) for row in normalized_rows]
    else:
        # Admin/Warden/Guard: query ORM bình thường
        query = db.query(Prisoner)
        if name:
            query = query.filter(Prisoner.full_name.ilike(f"%{name}%"))
        if risk_level:
            query = query.filter(Prisoner.risk_level == risk_level)
        if location_id is not None:
            query = query.filter(Prisoner.current_location_id == location_id)
        if prisoner_id is not None:
            query = query.filter(Prisoner.prisoner_id == prisoner_id)
        return query.order_by(Prisoner.prisoner_id.desc()).offset(offset).limit(page_size).all()


@router.post("/", response_model=PrisonerRead, status_code=status.HTTP_201_CREATED)
def create_prisoner(
    payload: PrisonerCreate,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden")),
    db: Session = Depends(get_db),
):
    # Set audit context manually (safer, avoids dependency stacking issues with get_audit_context)
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)

    if payload.current_location_id is not None:
        _ensure_location_capacity(db, payload.current_location_id)

    prisoner = Prisoner(**payload.model_dump())
    db.add(prisoner)
    db.commit()
    db.refresh(prisoner)
    return PrisonerRead.model_validate(prisoner)


@router.get("/{prisoner_id}", response_model=PrisonerDetail | PrisonerReadBasic)
def get_prisoner(
    prisoner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> PrisonerDetail | PrisonerReadBasic:
    """
    Get single prisoner detail.
    - Non-Viewer: full data + enrichment (location, active projects).
    - Viewer: dữ liệu từ View (có thể ít trường nhạy cảm hơn).
    """
    table_name = get_table_name_for_role("Prisoners", current_user.role)

    if table_name.startswith("vw_"):
        # Viewer: lấy từ View cơ bản (dùng helper chung)
        normalized_rows = execute_viewer_query(
            db, table_name, where_clause="PrisonerID = :pid", params={"pid": prisoner_id}
        )
        if not normalized_rows:
            raise HTTPException(status_code=404, detail="Prisoner not found")

        # Viewer: enrichment data (location_name, projects) thường bị ẩn hoặc trả None/[]
        # vì vw_Prisoners_Basic chỉ cung cấp dữ liệu cơ bản (không join nhạy cảm).
        return PrisonerReadBasic.model_validate(normalized_rows[0])
    else:
        # Full role
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
            .join(Schedule, Schedule.project_id == LaborProject.project_id)
            .filter(
                Schedule.prisoner_id == prisoner_id,
                Schedule.status == "Active",
                cast(Schedule.start_time, SQLDate) == date.today(),
            )
            .distinct()
            .all()
        )

        prisoner_data = PrisonerRead.model_validate(prisoner).model_dump()
        return PrisonerDetail(
            **prisoner_data,
            current_location_name=location_name,
            projects=[name for (name,) in projects],
        )


@router.put("/{prisoner_id}", response_model=PrisonerRead)
def update_prisoner(
    prisoner_id: int,
    payload: PrisonerUpdate,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)

    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

    data = payload.model_dump(exclude_unset=True)
    if current_user.role not in {"Admin", "Warden"}:
        forbidden_fields = set(data) - GUARD_EDITABLE_FIELDS
        if forbidden_fields:
            raise HTTPException(
                status_code=403,
                detail="Guard can only edit full_name, gender, crime_type, risk_level, and rehab_hours",
            )

    new_location_id = data.get("current_location_id")
    if new_location_id is not None and new_location_id != prisoner.current_location_id:
        _ensure_location_capacity(db, new_location_id, exclude_prisoner_id=prisoner_id)

    for field, value in data.items():
        setattr(prisoner, field, value)
    prisoner.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(prisoner)
    return PrisonerRead.model_validate(prisoner)


@router.delete("/{prisoner_id}", response_model=MessageResponse)
def delete_prisoner(
    prisoner_id: int,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)

    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

    db.query(VisitRequest).filter(VisitRequest.prisoner_id == prisoner_id).delete(synchronize_session=False)
    db.query(Visit).filter(Visit.prisoner_id == prisoner_id).delete(synchronize_session=False)
    db.query(Incident).filter(Incident.prisoner_id == prisoner_id).delete(synchronize_session=False)
    db.query(LaborAssignment).filter(LaborAssignment.prisoner_id == prisoner_id).delete(synchronize_session=False)
    db.query(DailyPerformance).filter(DailyPerformance.prisoner_id == prisoner_id).delete(synchronize_session=False)
    db.query(Schedule).filter(Schedule.prisoner_id == prisoner_id).delete(synchronize_session=False)

    db.delete(prisoner)
    db.commit()
    return MessageResponse(detail="Prisoner deleted")
