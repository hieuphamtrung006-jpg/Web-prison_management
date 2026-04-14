# backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import models
from database import get_db
import security

router = APIRouter(prefix="/auth", tags=["Xác thực & Đăng nhập"])

@router.post("/login", summary="Đăng nhập để nhận Token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Tìm user trong DB bằng Username
    user = db.query(models.User).filter(models.User.Username == form_data.username).first()
    
    # 2. Kiểm tra mật khẩu
    if not user or not security.verify_password(form_data.password, user.PasswordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Tạo thẻ Token chứa thông tin Username và Role
    access_token = security.create_access_token(
        data={"sub": user.Username, "role": user.Role}
    )
    
    # 4. Trả thẻ về cho Frontend
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_info": {
            "FullName": user.FullName,
            "Role": user.Role
        }
    }