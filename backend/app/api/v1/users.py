from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.core.security import hash_password
from app.db.models.incident import Incident
from app.db.models.labor import DailyPerformance, LaborAssignment
from app.db.models.user import User
from app.db.models.visit import Visit
from app.schemas.common import MessageResponse
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter()


@router.get("/", response_model=list[UserRead])
def list_users(
    active_only: bool = True,
    role: str | None = Query(default=None, description="Filter by user role"),
    search: str | None = Query(default=None, description="Search by username or full name"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> list[User]:
    """List users with optional filtering and pagination.
    
    Args:
        active_only: Only return active users (default: True)
        role: Filter by specific role (Admin, Warden, Guard, Viewer)
        search: Search by username or full name
        page: Page number (starts at 1)
        page_size: Items per page (max 100)
    """
    query = db.query(User)
    
    if active_only:
        query = query.filter(User.is_active == True)
    
    if role:
        query = query.filter(User.role == role)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_term)) | (User.full_name.ilike(search_term))
        )
    
    offset = (page - 1) * page_size
    return query.order_by(User.user_id.desc()).offset(offset).limit(page_size).all()


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> User:
    exists = db.query(User).filter(User.username == payload.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        email=payload.email,
        phone=payload.phone,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        user.password_hash = hash_password(data.pop("password"))

    for field, value in data.items():
        setattr(user, field, value)
    user.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin")),
) -> MessageResponse:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    has_incidents = db.query(Incident.incident_id).filter(Incident.created_by == user_id).first()
    has_visits = db.query(Visit.visit_id).filter(Visit.approved_by == user_id).first()
    has_assignments = db.query(LaborAssignment.assignment_id).filter(LaborAssignment.assigned_by == user_id).first()
    has_performance = (
        db.query(DailyPerformance.performance_id)
        .filter(DailyPerformance.evaluated_by == user_id)
        .first()
    )
    if has_incidents or has_visits or has_assignments or has_performance:
        raise HTTPException(status_code=400, detail="User has related records and cannot be deleted")

    db.delete(user)
    db.commit()
    return MessageResponse(detail="User deleted")
