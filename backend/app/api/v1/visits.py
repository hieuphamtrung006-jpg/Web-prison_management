from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import cast
from sqlalchemy import Date as SQLDate
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.prisoner import Prisoner
from app.db.models.user import User
from app.db.models.visit import Visit
from app.db.models.visit_request import VisitRequest
from app.schemas.common import MessageResponse
from app.schemas.visit import VisitCreate, VisitRead, VisitRequestCreate, VisitRequestRead, VisitUpdate

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
    _: User = Depends(require_roles("Warden", "Guard")),
) -> list[VisitRequestRead]:
    rows = (
        db.query(VisitRequest)
        .filter(VisitRequest.status == "Pending")
        .order_by(VisitRequest.request_id.desc())
        .all()
    )
    return [VisitRequestRead.model_validate(row) for row in rows]


@router.put("/requests/{request_id}/approve", response_model=VisitRead)
def approve_visit_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Warden", "Guard")),
) -> VisitRead:
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
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Warden", "Guard")),
) -> VisitRequestRead:
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


@router.get("/", response_model=list[VisitRead])
def list_visits(
    status_filter: str = Query(default="Pending", min_length=1, max_length=20),
    today_only: bool = True,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[VisitRead]:
    query = db.query(Visit).filter(Visit.status == status_filter)
    if today_only:
        query = query.filter(cast(Visit.visit_date, SQLDate) == date.today())
    offset = (page - 1) * page_size
    rows = query.order_by(Visit.visit_id.desc()).offset(offset).limit(page_size).all()
    return [VisitRead.model_validate(row) for row in rows]


@router.get("/{visit_id}", response_model=VisitRead)
def get_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> VisitRead:
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return VisitRead.model_validate(visit)


@router.post("/", response_model=VisitRead, status_code=status.HTTP_201_CREATED)
def create_visit(
    payload: VisitCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> VisitRead:
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden")),
) -> VisitRead:
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
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> VisitRead:
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
