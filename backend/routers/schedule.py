# backend/routers/schedule.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models
from database import get_db
from ai_engine import GeneticAlgorithmScheduler

router = APIRouter(prefix="/schedules", tags=["AI Lập lịch (GA)"])

@router.post("/generate", summary="Chạy AI Lập lịch bằng Genetic Algorithm")
def generate_schedule(config_id: int, target_date: datetime, db: Session = Depends(get_db)):
    # 1. GOM DỮ LIỆU (Fetch)
    config = db.query(models.SchedulingConfig).filter(models.SchedulingConfig.ConfigID == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình AI")

    prisoners = db.query(models.Prisoner).filter(models.Prisoner.Status == 'InPrison').all()
    projects = db.query(models.LaborProject).filter(models.LaborProject.IsActive == True).all()
    shifts = db.query(models.Shift).filter(models.Shift.IsForStaff == False).all()

    if not prisoners or not projects or not shifts:
        raise HTTPException(status_code=400, detail="Chưa có đủ dữ liệu Tù nhân/Dự án/Ca để lập lịch")

    # 2. CHẠY THUẬT TOÁN (Run GA)
    print("🚀 Đang khởi động Genetic Algorithm...")
    ga = GeneticAlgorithmScheduler(
        prisoners=prisoners, 
        projects=projects, 
        shifts=shifts, 
        config=config,
        pop_size=50,      # Quần thể 50 cá thể
        generations=100   # Tiến hóa 100 thế hệ
    )
    
    best_schedule = ga.run()
    print("✅ Đã tìm ra lịch trình tối ưu!")

    # 3. LƯU VẾT XUỐNG DB
    saved_records = []
    for item in best_schedule:
        # Lấy giờ bắt đầu/kết thúc từ bảng Shift
        shift_info = db.query(models.Shift).filter(models.Shift.ShiftID == item["ShiftID"]).first()
        
        # Mẹo tính toán datetime chuẩn
        start_dt = datetime.combine(target_date.date(), shift_info.StartTime)
        end_dt = datetime.combine(target_date.date(), shift_info.EndTime)

        new_schedule = models.Schedule(
            PrisonerID=item["PrisonerID"],
            ProjectID=item["ProjectID"],
            ShiftID=item["ShiftID"],
            StartTime=start_dt,
            EndTime=end_dt,
            AlgorithmTag='Genetic'
        )
        db.add(new_schedule)
        saved_records.append(new_schedule)

    # Cập nhật LastRun cho bảng Config
    config.LastRun = datetime.utcnow()
    
    db.commit()

    return {
        "status": "success", 
        "message": f"Đã lập lịch thành công cho {len(saved_records)} tù nhân bằng Genetic Algorithm!",
        "algorithm": "Genetic"
    }