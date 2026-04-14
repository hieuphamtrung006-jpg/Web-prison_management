from pydantic import BaseModel, Field, EmailStr
from datetime import date, datetime
from typing import Optional
from enum import Enum

# 1. Khai báo các hằng số hợp lệ (Validation chặt chẽ)
class RiskLevelEnum(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"

class GenderEnum(str, Enum):
    male = "Male"
    female = "Female"
    other = "Other"

class RoleEnum(str, Enum):
    admin = "Admin"
    warden = "Warden"
    guard = "Guard"
    viewer = "Viewer"

# ================= SCHEMA CHO PRISONER =================

# Schema dùng khi React gửi dữ liệu tạo mới lên
class PrisonerCreate(BaseModel):
    FullName: str = Field(..., min_length=2, max_length=100)
    DateOfBirth: date # Tự động bắt lỗi nếu React gửi lên không đúng dạng YYYY-MM-DD
    Gender: GenderEnum
    CrimeType: Optional[str] = None
    RiskLevel: RiskLevelEnum # Nếu React gửi lên "Very High", API sẽ báo lỗi 422 ngay lập tức
    CurrentLocationID: Optional[int] = None
    SentenceStart: Optional[date] = None
    SentenceEnd: Optional[date] = None

# Schema dùng khi API trả dữ liệu về cho React (giấu bớt các trường không cần thiết)
class PrisonerResponse(BaseModel):
    PrisonerID: int
    FullName: str
    DateOfBirth: date
    RiskLevel: str
    Status: str
    
    class Config:
        from_attributes = True # Giúp Pydantic "hiểu" được model của SQLAlchemy

# ================= SCHEMA CHO USER =================

class UserCreate(BaseModel):
    Username: str = Field(..., min_length=4)
    Password: str = Field(..., min_length=6) # Lưu ý: Khi lưu vào DB phải hash mật khẩu này
    FullName: str
    Role: RoleEnum
    Email: Optional[EmailStr] = None # Tự động kiểm tra đúng định dạng @gmail.com

class UserResponse(BaseModel):
    UserID: int
    Username: str
    FullName: str
    Role: str
    IsActive: bool
    
    class Config:
        from_attributes = True