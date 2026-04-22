from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.schedule import Shift
from app.db.models.user import User

router = APIRouter()


@router.get("/")
def list_shifts(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[dict]:
    rows = db.query(Shift).order_by(Shift.shift_id).all()
    return jsonable_encoder(rows)
