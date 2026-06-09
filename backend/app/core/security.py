from datetime import datetime, timedelta, timezone
import hashlib
import string

import bcrypt
import jwt
from jwt import InvalidTokenError

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    password_bytes = password.encode("utf-8")
    # bcrypt only uses the first 72 bytes; truncate to avoid backend errors
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


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
        plain_bytes = plain_password.encode("utf-8")
        if len(plain_bytes) > 72:
            plain_bytes = plain_bytes[:72]
        return bcrypt.checkpw(plain_bytes, hashed_password.encode("utf-8"))
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


def get_table_name_for_role(base_table: str, user_role: str) -> str:
    """
    Trả về tên bảng hoặc View tương ứng dựa trên role của user.
    Dùng cho các truy vấn SELECT để tận dụng DB-level row/column filtering qua View cho Viewer.
    """
    if user_role == "Viewer":
        view_mapping = {
            "Prisoners": "vw_Prisoners_Basic",
            "Visits": "vw_Visits_Basic",
            "Incidents": "vw_Incidents_Basic",
            "LaborAssignments": "vw_LaborAssignments_Basic",
            "DailyPerformance": "vw_DailyPerformance_Basic",
            "Locations": "vw_Locations_Basic",
        }
        return view_mapping.get(base_table, base_table)
    return base_table