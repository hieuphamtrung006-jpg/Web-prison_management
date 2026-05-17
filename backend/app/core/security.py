from datetime import datetime, timedelta, timezone
import hashlib
import string

import jwt
from jwt import InvalidTokenError
from passlib.context import CryptContext

from app.core.config import settings

# Chỉ dùng bcrypt thuần
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def is_legacy_sha256_hash(hashed_password: str) -> bool:
    """Return True for legacy SHA256 hex hashes (seed data)."""
    if len(hashed_password) != 64:
        return False
    return all(char in string.hexdigits for char in hashed_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Hỗ trợ cả legacy SHA256 (từ seed data) và bcrypt"""
    if is_legacy_sha256_hash(hashed_password):
        return hashlib.sha256(plain_password.encode("utf-8")).hexdigest() == hashed_password
    
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_access_token(subject: str, role: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
    except InvalidTokenError as exc:
        raise ValueError("Invalid token") from exc