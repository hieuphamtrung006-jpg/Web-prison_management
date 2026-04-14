# backend/security.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models
from database import get_db

# 1. Cấu hình chìa khóa bảo mật (NÊN GIẤU KÍN TRONG THỰC TẾ)
SECRET_KEY = "phu_prison_secret_key_super_strong_123!" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120 # Thẻ có hạn trong 2 tiếng

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login") # Đường dẫn để lấy thẻ

# 2. Hàm kiểm tra và tạo mật khẩu băm
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# 3. Hàm cấp thẻ thông hành (JWT Token)
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 4. CHỐT CHẶN 1: Kiểm tra thẻ hợp lệ và tìm ra ai đang cầm thẻ
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin (Thẻ giả hoặc hết hạn)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Giải mã thẻ để lấy Username
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Vào DB tìm người này
    user = db.query(models.User).filter(models.User.Username == username).first()
    if user is None:
        raise credentials_exception
    return user

# 5. CHỐT CHẶN 2: Kiểm tra chức vụ (Role)
class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: models.User = Depends(get_current_user)):
        if current_user.Role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cảnh báo! Quyền '{current_user.Role}' không được phép thực hiện hành động này."
            )
        return current_user