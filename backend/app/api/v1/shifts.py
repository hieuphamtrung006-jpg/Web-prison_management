from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.schedule import Shift
from app.db.models.user import User
from app.schemas.shift import ShiftRead

router = APIRouter()


@router.get("/", response_model=list[ShiftRead])
def list_shifts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[ShiftRead]:
    offset = (page - 1) * page_size
    rows = db.query(Shift).order_by(Shift.shift_id.desc()).offset(offset).limit(page_size).all()
    return [ShiftRead.model_validate(row) for row in rows]


@router.get("/{shift_id}", response_model=ShiftRead)
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> ShiftRead:
    shift = db.query(Shift).filter(Shift.shift_id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return ShiftRead.model_validate(shift)
