# backend/routers/economy.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import get_db
from pydantic import BaseModel
from datetime import date

router = APIRouter(prefix="/economy", tags=["Kinh tế & Lao động"])

# Schema tạm thời để nhận dữ liệu từ React
class ProjectCreate(BaseModel):
    ProjectName: str
    RevenuePerHour: float
    MaxWorkers: int

class PerformanceCreate(BaseModel):
    PrisonerID: int
    ProjectID: int
    WorkDate: date
    Productivity: float
    Notes: str = ""

# --- API TẠO DỰ ÁN LAO ĐỘNG ---
@router.post("/projects", summary="Tạo dự án lao động mới")
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    new_project = models.LaborProject(**project.dict())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

# --- API GHI NHẬN NĂNG SUẤT ---
@router.post("/performance", summary="Nhập năng suất lao động hàng ngày")
def record_performance(perf: PerformanceCreate, db: Session = Depends(get_db)):
    # Có thể thêm logic kiểm tra xem Tù nhân và Dự án có tồn tại không ở đây
    new_perf = models.DailyPerformance(**perf.dict())
    db.add(new_perf)
    db.commit()
    return {"status": "success", "message": "Đã ghi nhận năng suất thành công!"}