# backend/routers/legal.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import get_db
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/legal", tags=["Pháp lý & Sự cố"])

class IncidentCreate(BaseModel):
    PrisonerID: int
    IncidentType: str
    Severity: str # Low, Medium, High
    PenaltyPoints: int
    Description: str

# --- API GHI NHẬN VI PHẠM ---
@router.post("/incidents", summary="Ghi nhận sự cố/vi phạm của phạm nhân")
def report_incident(incident: IncidentCreate, db: Session = Depends(get_db)):
    # 1. Lưu hồ sơ vi phạm
    new_incident = models.Incident(
        PrisonerID=incident.PrisonerID,
        IncidentDate=datetime.utcnow(),
        IncidentType=incident.IncidentType,
        Severity=incident.Severity,
        PenaltyPoints=incident.PenaltyPoints,
        Description=incident.Description
    )
    db.add(new_incident)
    
    # 2. Cập nhật (Trừ điểm/Cộng giờ cải tạo) cho phạm nhân đó
    prisoner = db.query(models.Prisoner).filter(models.Prisoner.PrisonerID == incident.PrisonerID).first()
    if prisoner:
        # Ví dụ: Mỗi điểm phạt = cộng thêm 2 giờ RehabHours
        prisoner.RehabHours += (incident.PenaltyPoints * 2)
        
    db.commit()
    return {"status": "success", "message": f"Đã ghi nhận vi phạm và cập nhật hồ sơ cho phạm nhân ID {incident.PrisonerID}"}

# --- API DUYỆT THĂM THÂN ---
@router.put("/visits/{visit_id}/approve", summary="Phê duyệt lịch thăm thân")
def approve_visit(visit_id: int, admin_user_id: int, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.VisitID == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch hẹn này")
    
    visit.Status = 'Approved'
    visit.ApprovedBy = admin_user_id
    db.commit()
    return {"status": "success", "message": "Đã phê duyệt lịch thăm!"}