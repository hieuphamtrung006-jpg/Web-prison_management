from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import cast
from sqlalchemy import Date as SQLDate
from sqlalchemy.orm import Session

from fastapi import Request

from app.core.audit import set_audit_context
from app.core.deps import get_db, require_roles
from app.core.security import execute_viewer_query, get_table_name_for_role
from app.db.models.user import User
from app.db.models.prisoner import Prisoner
from app.db.models.visit import Visit
from app.db.models.visit_request import VisitRequest
from app.schemas.common import MessageResponse
from app.schemas.visit import (
    VisitCreate,
    VisitRead,
    VisitReadBasic,
    VisitRequestCreate,
    VisitRequestRead,
    VisitUpdate,
)



router = APIRouter()


@router.post("/request", response_model=VisitRequestRead, status_code=status.HTTP_201_CREATED)
def request_visit(
    payload: VisitRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Viewer")),
) -> VisitRequestRead:
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == payload.prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

    request = VisitRequest(
        prisoner_id=payload.prisoner_id,
        viewer_id=current_user.user_id,
        requested_date=payload.requested_date,
        status="Pending",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return VisitRequestRead.model_validate(request)


@router.get("/requests/pending", response_model=list[VisitRequestRead])
def list_pending_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> list[VisitRequestRead]:
    rows = (
        db.query(VisitRequest)
        .filter(VisitRequest.status == "Pending")
        .order_by(VisitRequest.request_id.desc())
        .all()
    )
    return [VisitRequestRead.model_validate(row) for row in rows]


@router.get("/requests/mine", response_model=list[VisitRequestRead])
def list_my_visit_requests(
    current_user: User = Depends(require_roles("Viewer")),
    db: Session = Depends(get_db),
) -> list[VisitRequestRead]:
    """Viewer xem danh sách các request mà chính họ đã tạo (kèm trạng thái)."""
    rows = (
        db.query(VisitRequest)
        .filter(VisitRequest.viewer_id == current_user.user_id)
        .order_by(VisitRequest.request_id.desc())
        .all()
    )
    return [VisitRequestRead.model_validate(row) for row in rows]


@router.put("/requests/{request_id}/approve", response_model=VisitRead)
def approve_visit_request(
    request_id: int,
    request: Request,
    current_user: User = Depends(require_roles("Warden", "Guard")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)
    request = db.query(VisitRequest).filter(VisitRequest.request_id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Visit request not found")
    if request.status != "Pending":
        raise HTTPException(status_code=400, detail="Request is not pending")

    viewer = db.query(User).filter(User.user_id == request.viewer_id).first()
    visitor_name = (viewer.full_name if viewer and viewer.full_name else None) or (
        viewer.username if viewer else "Viewer"
    )

    visit = Visit(
        prisoner_id=request.prisoner_id,
        visitor_name=visitor_name,
        visit_date=request.requested_date,
        status="Approved",
        approved_by=current_user.user_id,
        notes=f"Approved request #{request.request_id}",
    )

    request.status = "Approved"
    request.updated_at = datetime.now(timezone.utc)
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return VisitRead.model_validate(visit)


@router.put("/requests/{request_id}/reject", response_model=VisitRequestRead)
def reject_visit_request(
    request_id: int,
    request: Request,
    current_user: User = Depends(require_roles("Warden", "Guard")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)
    request = db.query(VisitRequest).filter(VisitRequest.request_id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Visit request not found")
    if request.status != "Pending":
        raise HTTPException(status_code=400, detail="Request is not pending")

    request.status = "Rejected"
    request.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    return VisitRequestRead.model_validate(request)


@router.get("/", response_model=list[VisitRead] | list[VisitReadBasic])
def list_visits(
    status_filter: str = Query(default="Pending", min_length=1, max_length=20),
    today_only: bool = True,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[VisitRead] | list[VisitReadBasic]:
    """
    List visits.
    - Non-Viewer: query bảng Visits.
    - Viewer: query vw_Visits_Basic.
    """
    table_name = get_table_name_for_role("Visits", current_user.role)
    offset = (page - 1) * page_size

    if table_name.startswith("vw_"):
        conditions = ["Status = :status"]
        params = {
            "status": status_filter,
            "offset": offset,
            "limit": page_size,
        }
        if today_only:
            conditions.append("CAST(VisitDate AS DATE) = CAST(GETDATE() AS DATE)")

        where_clause = " AND ".join(conditions)
        order_by = "ORDER BY VisitID DESC"
        limit_clause = "OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY"

        normalized_rows = execute_viewer_query(
            db,
            table_name,
            where_clause=where_clause,
            params=params,
            order_by=order_by,
            limit_clause=limit_clause,
        )
        return [VisitReadBasic.model_validate(row) for row in normalized_rows]
    else:
        # Full access
        query = db.query(Visit).filter(Visit.status == status_filter)
        if today_only:
            query = query.filter(cast(Visit.visit_date, SQLDate) == date.today())
        rows = query.order_by(Visit.visit_id.desc()).offset(offset).limit(page_size).all()
        return [VisitRead.model_validate(row) for row in rows]


@router.get("/{visit_id}", response_model=VisitRead | VisitReadBasic)
def get_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> VisitRead | VisitReadBasic:
    table_name = get_table_name_for_role("Visits", current_user.role)

    if table_name.startswith("vw_"):
        normalized_rows = execute_viewer_query(
            db, table_name, where_clause="VisitID = :vid", params={"vid": visit_id}
        )
        if not normalized_rows:
            raise HTTPException(status_code=404, detail="Visit not found")

        # Viewer: trả về Basic schema (có thể thiếu approved_by, notes, timestamps)
        return VisitReadBasic.model_validate(normalized_rows[0])
    else:
        visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")
        return VisitRead.model_validate(visit)


@router.post("/", response_model=VisitRead, status_code=status.HTTP_201_CREATED)
def create_visit(
    payload: VisitCreate,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
    db: Session = Depends(get_db),
) -> VisitRead:
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)

    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == payload.prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")

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
    return VisitRead.model_validate(visit)


@router.put("/{visit_id}/approve", response_model=VisitRead)
def approve_visit(
    visit_id: int,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    visit.status = "Approved"
    visit.approved_by = current_user.user_id
    visit.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(visit)
    return VisitRead.model_validate(visit)


@router.put("/{visit_id}", response_model=VisitRead)
def update_visit(
    visit_id: int,
    payload: VisitUpdate,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    data = payload.model_dump(exclude_unset=True)
    if "prisoner_id" in data:
        prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == data["prisoner_id"]).first()
        if not prisoner:
            raise HTTPException(status_code=404, detail="Prisoner not found")

    for field, value in data.items():
        setattr(visit, field, value)
    visit.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(visit)
    return VisitRead.model_validate(visit)


@router.delete("/{visit_id}", response_model=MessageResponse)
def delete_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> MessageResponse:
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    db.delete(visit)
    db.commit()
    return MessageResponse(detail="Visit deleted")
