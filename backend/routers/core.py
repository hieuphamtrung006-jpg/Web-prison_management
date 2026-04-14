# backend/routers/core.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import models, schemas
from database import get_db

router = APIRouter(prefix="/core", tags=["Nhân sự & Khu vực"])

# --- API TÙ NHÂN ---
@router.get("/prisoners", summary="Lấy danh sách tù nhân (Có lọc & phân trang)")
def get_prisoners(
    skip: int = Query(0, description="Bỏ qua bao nhiêu dòng đầu tiên"),
    limit: int = Query(20, description="Số lượng lấy tối đa mỗi trang"),
    risk_level: Optional[str] = Query(None, description="Lọc theo: Low, Medium, High"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Prisoner)
    
    # Nếu React có truyền tham số lọc risk_level thì thêm điều kiện
    if risk_level:
        query = query.filter(models.Prisoner.RiskLevel == risk_level)
        
    prisoners = query.offset(skip).limit(limit).all()
    total = query.count()
    
    return {
        "total": total,
        "data": prisoners
    }

# --- API KHU VỰC (LOCATIONS) ---
@router.get("/locations/status", summary="Xem tình trạng sức chứa của các khu vực")
def get_location_status(db: Session = Depends(get_db)):
    locations = db.query(models.Location).all()
    result = []
    
    for loc in locations:
        # Đếm số tù nhân đang ở khu vực này
        current_occupants = db.query(models.Prisoner).filter(
            models.Prisoner.CurrentLocationID == loc.LocationID
        ).count()
        
        result.append({
            "LocationID": loc.LocationID,
            "LocationName": loc.LocationName,
            "Type": loc.Type,
            "Capacity": loc.Capacity,
            "CurrentOccupants": current_occupants,
            "AvailableSlots": loc.Capacity - current_occupants # Số chỗ còn trống
        })
    return result