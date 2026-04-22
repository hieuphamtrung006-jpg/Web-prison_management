from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    is_legacy_sha256_hash,
    verify_password,
)
from app.db.models.user import User

router = APIRouter()
optional_bearer = HTTPBearer(auto_error=False)

ALLOWED_ROLES = {"Admin", "Warden", "Guard", "Viewer"}
PRIVILEGED_SIGNUP_ROLES = {"Admin", "Warden", "Guard"}


class LoginRequest(BaseModel):
    username: str
    password: str


class SignUpRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: Literal["Admin", "Warden", "Guard", "Viewer"] = "Viewer"
    email: str | None = None
    phone: str | None = None


def _resolve_token_user(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> User | None:
    if not credentials:
        return None

    try:
        payload = decode_access_token(credentials.credentials)
        username = payload.get("sub")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return db.query(User).filter(User.username == username, User.is_active.is_(True)).first()


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict:
    user = (
        db.query(User)
        .filter(User.username == payload.username, User.is_active.is_(True))
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if is_legacy_sha256_hash(user.password_hash):
        user.password_hash = hash_password(payload.password)
        db.commit()

    token = create_access_token(
        subject=user.username,
        role=user.role,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignUpRequest,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Security(optional_bearer),
) -> dict:
    if payload.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    if payload.role in PRIVILEGED_SIGNUP_ROLES:
        token_user = _resolve_token_user(credentials, db)
        if not token_user or token_user.role != "Admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin can create Admin/Warden/Guard accounts",
            )

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

    token = create_access_token(
        subject=user.username,
        role=user.role,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {
        "user_id": user.user_id,
        "username": user.username,
        "role": user.role,
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)) -> dict:
    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }
