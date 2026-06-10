import sys
import os
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from sqlalchemy import inspect

# Add current path to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine
from app.core.security import hash_password
from app.db.models.user import User
from app.db.models.prisoner import Prisoner
from app.db.models.location import Location
from app.db.models.labor import LaborProject, LaborAssignment, DailyPerformance
from app.db.models.schedule import Shift, Schedule, SchedulingConfig
from app.db.models.incident import Incident
from app.db.models.visit import Visit
from app.db.models.visit_request import VisitRequest
from app.db.models.audit_log import AuditLog

def seed():
    db = SessionLocal()
    inspector = inspect(engine)
    has_audit_log = inspector.has_table("AuditLog")
    
    # ---------------------------------------------------------
    # Raw Data Definitions to maintain encoding integrity
    # ---------------------------------------------------------
    raw_shifts = [
        # (shift_id, shift_type, start_time, end_time, capacity, is_for_staff)
        (1, "Ca Sinh hoạt / Thể dục Sáng", time(6, 0), time(7, 0), 250, False),
        (2, "Ca Lao động Sáng", time(7, 30), time(11, 30), 250, False),
        (3, "Ca Ăn Trưa & Nghỉ ngơi", time(11, 30), time(13, 0), 250, False),
        (4, "Ca Lao động Chiều", time(13, 30), time(17, 30), 250, False),
        (5, "Ca Sinh hoạt / Tự do Chiều", time(17, 30), time(18, 30), 250, False),
        (6, "Ca Ăn Tối", time(18, 30), time(19, 30), 250, False),
        (7, "Ca Điểm danh & Khóa buồng", time(21, 0), time(5, 30), 250, False),
        (8, "Ca Trực Hành chính (Giám thị)", time(7, 30), time(17, 30), 10, True),
        (9, "Ca Trực Bảo vệ Sáng", time(6, 0), time(14, 0), 15, True),
        (10, "Ca Trực Bảo vệ Chiều", time(14, 0), time(22, 0), 15, True),
        (11, "Ca Trực Bảo vệ Đêm", time(22, 0), time(6, 0), 10, True),
    ]

    raw_locations = [
        # (location_id, location_name, type, capacity, security_level)
        (1, "Buồng giam Tập thể C-15", "Cell", 20, "medium"),
        (2, "Buồng giam Tập thể C-16", "Cell", 20, "medium"),
        (3, "Khu giam chất lượng cao A-01", "Cell", 5, "high"),
        (4, "Khu giam chất lượng cao A-02", "Cell", 5, "high"),
        (5, "Khu giam biệt giam B-01", "Cell", 2, "max"),
        (6, "Xưởng gia công đồ gỗ", "Workshop", 30, "medium"),
        (7, "Xưởng may mặc đồ bảo hộ", "Workshop", 30, "medium"),
        (8, "Khu nông nghiệp chăn nuôi", "Workshop", 40, "low"),
        (9, "Nhà bếp trung tâm", "Workshop", 15, "medium"),
        (10, "Khu vực phân loại tái chế", "Workshop", 25, "medium"),
        (11, "Sân sinh hoạt & Thể thao", "Yard", 150, "medium"),
        (12, "Bệnh xá trung tâm", "Hospital", 15, "medium"),
        (13, "Phòng gặp thân nhân", "Dining", 20, "medium"),
    ]

    raw_users = [
        # (user_id, username, password_plain, full_name, role, email, phone)
        (1, "admin", "admin123", "Nguyễn Quốc Khánh", "Admin", "admin@prison.gov.vn", "0912345678"),
        (2, "warden", "warden123", "Lê Hữu Đạt", "Warden", "warden@prison.gov.vn", "0987654321"),
        (3, "guard", "guard123", "Nguyễn Minh Tuấn", "Guard", "guard@prison.gov.vn", "0901234567"),
        (4, "viewer", "viewer123", "Phạm Thùy Linh", "Viewer", "viewer@prison.gov.vn", "0934567890"),
    ]

    raw_projects = [
        # (project_id, project_name, location_id, revenue_per_hour, priority_score, max_workers, required_skills)
        (1, "Gia công bàn ghế gỗ xuất khẩu", 6, Decimal("15.00"), 5, 8, "Khéo tay, chịu lực tốt"),
        (2, "May trang phục bảo hộ lao động", 7, Decimal("12.00"), 4, 10, "Tỉ mỉ, khéo léo"),
        (3, "Trồng trọt rau quả sạch", 8, Decimal("8.50"), 3, 12, "Chăm chỉ, khỏe mạnh"),
        (4, "Phân loại rác & tái chế nhựa", 10, Decimal("10.00"), 2, 6, "Chịu khó, không ngại bụi bẩn"),
        (5, "Chế biến thực phẩm nhà bếp", 9, Decimal("0.00"), 4, 5, "Biết nấu ăn cơ bản"),
    ]

    raw_prisoners = [
        # (prisoner_id, FullName, DoB, Gender, Crime, Risk, CellID, Start, End, ProdScore)
        (1, "Trần Văn An", "1990-05-12", "Male", "Trộm cắp tài sản", "Low", 1, "2024-01-10", "2027-01-10", Decimal("8.5")),
        (2, "Nguyễn Thị Bình", "1988-11-23", "Female", "Lừa đảo chiếm đoạt tài sản", "Low", 2, "2023-05-15", "2028-05-15", Decimal("9.0")),
        (3, "Lê Hoàng Gia", "1995-02-14", "Male", "Trộm cắp tài sản", "Low", 1, "2025-03-20", "2028-03-20", Decimal("7.0")),
        (4, "Phạm Minh Đức", "1992-09-08", "Male", "Gây rối trật tự công cộng", "Low", 1, "2025-06-01", "2027-06-01", Decimal("8.0")),
        (5, "Đỗ Thanh Hằng", "1994-07-30", "Female", "Lừa đảo chiếm đoạt tài sản", "Low", 2, "2024-10-12", "2027-10-12", Decimal("8.8")),
        (6, "Vũ Việt Bách", "1991-04-18", "Male", "Trộm cắp tài sản", "Low", 1, "2023-12-05", "2026-12-05", Decimal("7.5")),
        (7, "Bùi Quang Vinh", "1989-12-01", "Male", "Gây rối trật tự công cộng", "Low", 2, "2024-08-20", "2026-08-20", Decimal("6.5")),
        (8, "Hoàng Quốc Bảo", "1993-01-25", "Male", "Lừa đảo chiếm đoạt tài sản", "Low", 1, "2025-01-15", "2029-01-15", Decimal("8.2")),
        (9, "Ngô Gia Huy", "1996-08-11", "Male", "Trộm cắp tài sản", "Low", 2, "2024-03-10", "2027-03-10", Decimal("9.2")),
        (10, "Phan Khánh Linh", "1997-10-05", "Female", "Lừa đảo chiếm đoạt tài sản", "Low", 2, "2025-05-01", "2028-05-01", Decimal("7.8")),
        (11, "Phạm Thanh Sơn", "1985-03-20", "Male", "Cố ý gây thương tích", "Medium", 1, "2022-04-18", "2029-04-18", Decimal("8.0")),
        (12, "Hoàng Việt Anh", "1993-08-05", "Male", "Tàng trữ trái phép chất ma túy", "Medium", 2, "2021-09-10", "2028-09-10", Decimal("7.5")),
        (13, "Nguyễn Văn Hùng", "1987-12-15", "Male", "Cố ý gây thương tích", "Medium", 1, "2020-02-10", "2027-02-10", Decimal("8.2")),
        (14, "Trần Tuấn Kiệt", "1996-06-25", "Male", "Tàng trữ trái phép chất ma túy", "Medium", 2, "2023-11-01", "2029-11-01", Decimal("6.8")),
        (15, "Lê Minh Triết", "1990-10-10", "Male", "Cố ý gây thương tích", "Medium", 1, "2024-05-12", "2031-05-12", Decimal("8.5")),
        (16, "Vũ Đức Thịnh", "1994-01-02", "Male", "Tàng trữ trái phép chất ma túy", "Medium", 2, "2022-07-15", "2028-07-15", Decimal("7.0")),
        (17, "Đặng Tấn Phát", "1989-05-14", "Male", "Cố ý gây thương tích", "Medium", 1, "2023-01-20", "2028-01-20", Decimal("7.9")),
        (18, "Bùi Thế Kiệt", "1992-11-19", "Male", "Tàng trữ trái phép chất ma túy", "Medium", 2, "2024-09-10", "2030-09-10", Decimal("8.1")),
        (19, "Phan Hữu Phước", "1986-07-08", "Male", "Cố ý gây thương tích", "Medium", 1, "2021-12-25", "2028-12-25", Decimal("8.4")),
        (20, "Lý Hoàng Phi", "1995-09-30", "Male", "Tàng trữ trái phép chất ma túy", "Medium", 2, "2023-03-14", "2029-03-14", Decimal("7.2")),
        (21, "Đặng Quốc Khánh", "1982-07-14", "Male", "Cướp tài sản", "High", 3, "2018-05-20", "2033-05-20", Decimal("6.0")),
        (22, "Bùi Hữu Đạt", "1990-10-02", "Male", "Cướp tài sản có tổ chức", "High", 4, "2019-12-15", "2034-12-15", Decimal("6.5")),
        (23, "Nguyễn Lâm Hùng", "1983-04-28", "Male", "Cướp tài sản", "High", 3, "2020-08-10", "2032-08-10", Decimal("5.5")),
        (24, "Lê Thế Dân", "1988-12-25", "Male", "Cướp tài sản có tổ chức", "High", 4, "2021-03-18", "2036-03-18", Decimal("7.0")),
        (25, "Trần Hữu Thọ", "1985-06-30", "Male", "Cướp tài sản", "High", 3, "2022-10-05", "2035-10-05", Decimal("6.2")),
        (26, "Vũ Đình Phong", "1987-11-12", "Male", "Cướp tài sản có tổ chức", "High", 4, "2023-02-14", "2038-02-14", Decimal("6.8")),
        (27, "Đỗ Ngọc Long", "1991-01-22", "Male", "Cướp tài sản", "High", 3, "2024-06-20", "2034-06-20", Decimal("5.8")),
        (28, "Phạm Thanh Hải", "1984-09-17", "Male", "Cướp tài sản có tổ chức", "High", 4, "2017-11-30", "2032-11-30", Decimal("7.2")),
        (29, "Hoàng Gia Lực", "1989-08-09", "Male", "Cướp tài sản", "High", 5, "2019-06-12", "2034-06-12", Decimal("6.0")),
        (30, "Lê Văn Định", "1986-05-04", "Male", "Cướp tài sản có tổ chức", "High", 5, "2020-03-25", "2035-03-25", Decimal("6.4")),
    ]

    raw_assignments = [
        # (prisoner_id, project_id, assigned_by, hours_assigned)
        (1, 1, 2, Decimal("4.00")),
        (3, 1, 2, Decimal("4.00")),
        (11, 1, 2, Decimal("4.00")),
        (13, 1, 2, Decimal("4.00")),
        (2, 2, 2, Decimal("4.00")),
        (5, 2, 2, Decimal("4.00")),
        (12, 2, 2, Decimal("4.00")),
        (6, 3, 2, Decimal("4.00")),
        (7, 3, 2, Decimal("4.00")),
        (8, 3, 2, Decimal("4.00")),
        (16, 3, 2, Decimal("4.00")),
        (9, 4, 2, Decimal("4.00")),
        (10, 4, 2, Decimal("4.00")),
        (14, 4, 2, Decimal("4.00")),
        (4, 5, 2, Decimal("4.00")),
        (15, 5, 2, Decimal("4.00")),
    ]

    raw_performances = [
        # (prisoner_id, project_id, evaluated_by, productivity, notes)
        (1, 1, 3, Decimal("85.0"), "Làm việc tốt, đúng giờ"),
        (2, 2, 3, Decimal("90.0"), "Hoàn thành chỉ tiêu may mặc"),
        (3, 1, 3, Decimal("75.0"), "Lao động nghiêm túc"),
        (4, 5, 3, Decimal("80.0"), "Chuẩn bị suất ăn chu đáo"),
    ]

    raw_incidents = [
        # (prisoner_id, location_id, incident_type, severity, penalty_points, description, created_by)
        (11, 11, "Tranh chấp/Gây gổ", "Medium", 10, "Xảy ra xích mích nhỏ tại sân sinh hoạt trong giờ giải lao", 3),
        (21, 3, "Không tuân thủ nội quy", "Low", 5, "Không tập trung đúng giờ điểm danh tối", 3),
    ]

    raw_visits = [
        # (prisoner_id, visitor_name, status, approved_by, notes)
        (1, "Trần Văn Minh", "Completed", 2, "Gặp mặt bình thường, chấp hành tốt nội quy phòng gặp"),
        (2, "Nguyễn Văn Hùng", "Pending", None, "Hẹn gặp ngày cuối tuần"),
    ]

    raw_visit_requests = [
        # (prisoner_id, viewer_id, status)
        (1, 4, "Approved"),
        (2, 4, "Pending"),
    ]

    try:
        print("Clearing database...")
        db.query(Schedule).delete()
        db.query(DailyPerformance).delete()
        db.query(LaborAssignment).delete()
        db.query(Incident).delete()
        db.query(Visit).delete()
        db.query(VisitRequest).delete()
        db.query(Prisoner).delete()
        
        if has_audit_log:
            print("AuditLog table found, clearing it...")
            db.query(AuditLog).delete()
        
        db.query(User).delete()
        db.query(LaborProject).delete()
        db.query(Location).delete()
        db.query(Shift).delete()
        db.query(SchedulingConfig).delete()
        
        if has_audit_log:
            db.query(AuditLog).delete()
        
        db.commit()
        print("Database cleared successfully.")
        
        # 1. Seed SchedulingConfigs
        print("Seeding SchedulingConfigs...")
        config = SchedulingConfig(
            config_id=1,
            config_name="Mặc định",
            weight_economy=Decimal("0.40"),
            weight_security=Decimal("0.30"),
            weight_rehab=Decimal("0.30"),
            created_at=datetime.now(timezone.utc)
        )
        db.add(config)
        db.commit()

        # 2. Seed Shifts
        print("Seeding Shifts...")
        shifts = [
            Shift(shift_id=sh[0], shift_type=sh[1], start_time=sh[2], end_time=sh[3], capacity=sh[4], is_for_staff=sh[5], created_at=datetime.now(timezone.utc))
            for sh in raw_shifts
        ]
        db.add_all(shifts)
        db.commit()

        # 3. Seed Locations
        print("Seeding Locations...")
        locations = [
            Location(location_id=loc[0], location_name=loc[1], type=loc[2], capacity=loc[3], security_level=loc[4], is_active=True, created_at=datetime.now(timezone.utc))
            for loc in raw_locations
        ]
        db.add_all(locations)
        db.commit()

        # 4. Seed Users
        print("Seeding Users...")
        users = [
            User(user_id=u[0], username=u[1], password_hash=hash_password(u[2]), full_name=u[3], role=u[4], email=u[5], phone=u[6], is_active=True, created_at=datetime.now(timezone.utc))
            for u in raw_users
        ]
        db.add_all(users)
        db.commit()

        # 5. Seed LaborProjects
        print("Seeding LaborProjects...")
        projects = [
            LaborProject(project_id=p[0], project_name=p[1], location_id=p[2], revenue_per_hour=p[3], priority_score=p[4], max_workers=p[5], required_skills=p[6], is_active=True, created_at=datetime.now(timezone.utc))
            for p in raw_projects
        ]
        db.add_all(projects)
        db.commit()

        # 6. Seed Prisoners
        print("Seeding Prisoners...")
        prisoners = [
            Prisoner(
                prisoner_id=p[0],
                full_name=p[1],
                date_of_birth=date.fromisoformat(p[2]),
                gender=p[3],
                crime_type=p[4],
                risk_level=p[5],
                current_location_id=p[6],
                sentence_start=date.fromisoformat(p[7]),
                sentence_end=date.fromisoformat(p[8]),
                status="InPrison",
                productivity_score=p[9],
                rehab_hours=24 + idx * 2,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            for idx, p in enumerate(raw_prisoners)
        ]
        db.add_all(prisoners)
        db.commit()

        # 7. Seed LaborAssignments
        print("Seeding LaborAssignments...")
        assignments = [
            LaborAssignment(prisoner_id=a[0], project_id=a[1], assigned_by=a[2], assignment_date=date.today(), hours_assigned=a[3], created_at=datetime.now(timezone.utc))
            for a in raw_assignments
        ]
        db.add_all(assignments)
        db.commit()

        # 8. Seed DailyPerformance
        print("Seeding DailyPerformance...")
        performances = [
            DailyPerformance(prisoner_id=dp[0], project_id=dp[1], evaluated_by=dp[2], work_date=date.today() - timedelta(days=1), productivity=dp[3], notes=dp[4], created_at=datetime.now(timezone.utc))
            for dp in raw_performances
        ]
        db.add_all(performances)
        db.commit()

        # 9. Seed Incidents
        print("Seeding Incidents...")
        incidents = [
            Incident(prisoner_id=inc[0], location_id=inc[1], incident_date=datetime.now() - timedelta(days=3), incident_type=inc[2], severity=inc[3], penalty_points=inc[4], description=inc[5], created_by=inc[6], created_at=datetime.now(timezone.utc))
            for inc in raw_incidents
        ]
        db.add_all(incidents)
        db.commit()

        # 10. Seed Visits & Requests
        print("Seeding Visits & VisitRequests...")
        visits = [
            Visit(prisoner_id=vi[0], visitor_name=vi[1], visit_date=datetime.now() + timedelta(days=2), status=vi[2], approved_by=vi[3], notes=vi[4], created_at=datetime.now(timezone.utc))
            for vi in raw_visits
        ]
        db.add_all(visits)
        
        visit_requests = [
            VisitRequest(prisoner_id=vr[0], viewer_id=vr[1], requested_date=datetime.now() - timedelta(days=2), status=vr[2], created_at=datetime.now(timezone.utc))
            for vr in raw_visit_requests
        ]
        db.add_all(visit_requests)
        db.commit()

        # 11. Generate Logical Schedules for Yesterday and Today
        print("Seeding Schedules...")
        schedules_list = []
        
        # Mappings
        project_assignments = {
            1: 1, 3: 1, 11: 1, 13: 1,
            2: 2, 5: 2, 12: 2,
            6: 3, 7: 3, 8: 3, 16: 3,
            9: 4, 10: 4, 14: 4,
            4: 5, 15: 5
        }
        project_locations = {1: 6, 2: 7, 3: 8, 4: 10, 5: 9}
        prisoner_cells = {p[0]: p[6] for p in raw_prisoners}
        prisoner_risks = {p[0]: p[5] for p in raw_prisoners}

        shift_times = {
            1: (time(6, 0), time(7, 0)),
            2: (time(7, 30), time(11, 30)),
            3: (time(11, 30), time(13, 0)),
            4: (time(13, 30), time(17, 30)),
            5: (time(17, 30), time(18, 30)),
            6: (time(18, 30), time(19, 30)),
            7: (time(21, 0), time(5, 30))
        }

        dates_to_seed = [date.today() - timedelta(days=1), date.today()]

        for target_date in dates_to_seed:
            for p_id in range(1, 31):
                cell_id = prisoner_cells[p_id]
                risk = prisoner_risks[p_id]
                proj_id = project_assignments.get(p_id)

                for s_id in range(1, 8):
                    start_t, end_t = shift_times[s_id]
                    start_dt = datetime.combine(target_date, start_t)
                    end_dt = datetime.combine(target_date, end_t)
                    if end_t < start_t:
                        end_dt += timedelta(days=1)

                    loc_id = cell_id
                    p_proj_id = None

                    if s_id in {2, 4}: # Labor
                        if proj_id:
                            p_proj_id = proj_id
                            loc_id = project_locations[proj_id]
                        else:
                            loc_id = cell_id
                    elif s_id in {1, 5}: # Recreation
                        if risk in {"Low", "Medium"}:
                            loc_id = 11
                        else:
                            loc_id = cell_id
                    elif s_id in {3, 6}: # Meal
                        if s_id == 3:
                            loc_id = 13 if p_id <= 15 else cell_id
                        else:
                            loc_id = 13 if p_id > 15 else cell_id
                    elif s_id == 7: # Sleep
                        loc_id = cell_id

                    s = Schedule(
                        prisoner_id=p_id,
                        project_id=p_proj_id,
                        location_id=loc_id,
                        shift_id=s_id,
                        start_time=start_dt,
                        end_time=end_dt,
                        status="Active",
                        created_at=datetime.now(timezone.utc)
                    )
                    schedules_list.append(s)

        db.add_all(schedules_list)
        db.commit()

        print("Schedules seeded successfully!")
        print("Generating SQL dump script seed_logical_data.sql...")
        
        # 12. Write seed_logical_data.sql using raw UTF-8 string values
        sql_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sql")
        os.makedirs(sql_dir, exist_ok=True)
        sql_path = os.path.join(sql_dir, "seed_logical_data.sql")
        
        with open(sql_path, "w", encoding="utf-8") as f:
            f.write("-- ==========================================================\n")
            f.write("-- PRISON Database Logical Seed Data\n")
            f.write("-- Generated on: " + datetime.now().isoformat() + "\n")
            f.write("-- ==========================================================\n\n")
            f.write("USE PRISON;\nGO\n\n")
            
            f.write("-- 1. Clear database tables in correct constraint order\n")
            f.write("PRINT 'Clearing tables...';\n")
            f.write("DELETE FROM Schedules;\n")
            f.write("DELETE FROM DailyPerformance;\n")
            f.write("DELETE FROM LaborAssignments;\n")
            f.write("DELETE FROM Incidents;\n")
            f.write("DELETE FROM VisitRequests;\n")
            f.write("DELETE FROM Visits;\n")
            f.write("DELETE FROM Prisoners;\n")
            f.write("DELETE FROM Users;\n")
            f.write("DELETE FROM LaborProjects;\n")
            f.write("DELETE FROM Locations;\n")
            f.write("DELETE FROM Shifts;\n")
            f.write("DELETE FROM SchedulingConfigs;\n")
            f.write("DBCC CHECKIDENT ('Schedules', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('DailyPerformance', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('LaborAssignments', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('Incidents', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('VisitRequests', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('Visits', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('Prisoners', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('Users', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('LaborProjects', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('Locations', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('Shifts', RESEED, 0);\n")
            f.write("DBCC CHECKIDENT ('SchedulingConfigs', RESEED, 0);\n")
            f.write("IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLog]') AND type in (N'U'))\n")
            f.write("BEGIN\n    DELETE FROM AuditLog;\n    DBCC CHECKIDENT ('AuditLog', RESEED, 0);\nEND\nGO\n\n")

            f.write("-- 2. Insert SchedulingConfigs\n")
            f.write("PRINT 'Seeding SchedulingConfigs...';\n")
            f.write("INSERT INTO SchedulingConfigs (ConfigName, WeightEconomy, WeightSecurity, WeightRehab, CreatedAt)\n")
            f.write("VALUES (N'Mặc định', 0.40, 0.30, 0.30, GETUTCDATE());\nGO\n\n")

            f.write("-- 3. Insert Shifts\n")
            f.write("PRINT 'Seeding Shifts...';\n")
            f.write("SET IDENTITY_INSERT Shifts ON;\n")
            for sh in raw_shifts:
                f.write(f"INSERT INTO Shifts (ShiftID, ShiftType, StartTime, EndTime, Capacity, IsForStaff, CreatedAt) "
                        f"VALUES ({sh[0]}, N'{sh[1]}', '{sh[2]}', '{sh[3]}', {sh[4]}, {1 if sh[5] else 0}, GETUTCDATE());\n")
            f.write("SET IDENTITY_INSERT Shifts OFF;\nGO\n\n")

            f.write("-- 4. Insert Locations\n")
            f.write("PRINT 'Seeding Locations...';\n")
            f.write("SET IDENTITY_INSERT Locations ON;\n")
            for loc in raw_locations:
                sec = f"'{loc[4]}'" if loc[4] else "NULL"
                f.write(f"INSERT INTO Locations (LocationID, LocationName, Type, Capacity, SecurityLevel, IsActive, CreatedAt) "
                        f"VALUES ({loc[0]}, N'{loc[1]}', '{loc[2]}', {loc[3]}, {sec}, 1, GETUTCDATE());\n")
            f.write("SET IDENTITY_INSERT Locations OFF;\nGO\n\n")

            f.write("-- 5. Insert Users (SHA-256 legacy hashes match the backend fallback verification)\n")
            f.write("PRINT 'Seeding Users...';\n")
            f.write("SET IDENTITY_INSERT Users ON;\n")
            legacy_hashes = {
                1: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
                2: "a08cacabcf3487a4830186ace52ea1cb2cabe3a69b9a037f2fcd67218963aaa3",
                3: "0c29b824ba1b408a3469d1581b79cb7b0a363155bf16f0e642cc9ba75d37b07d",
                4: "65375049b9e4d7cad6c9ba286fdeb9394b28135a3e84136404cfccfdcc438894"
            }
            for u in raw_users:
                phash = legacy_hashes[u[0]]
                f.write(f"INSERT INTO Users (UserID, Username, PasswordHash, FullName, Role, Email, Phone, IsActive, CreatedAt) "
                        f"VALUES ({u[0]}, '{u[1]}', '{phash}', N'{u[3]}', '{u[4]}', '{u[5]}', '{u[6]}', 1, GETUTCDATE());\n")
            f.write("SET IDENTITY_INSERT Users OFF;\nGO\n\n")

            f.write("-- 6. Insert LaborProjects\n")
            f.write("PRINT 'Seeding LaborProjects...';\n")
            f.write("SET IDENTITY_INSERT LaborProjects ON;\n")
            for proj in raw_projects:
                f.write(f"INSERT INTO LaborProjects (ProjectID, ProjectName, LocationID, RevenuePerHour, PriorityScore, MaxWorkers, RequiredSkills, IsActive, CreatedAt) "
                        f"VALUES ({proj[0]}, N'{proj[1]}', {proj[2]}, {proj[3]}, {proj[4]}, {proj[5]}, N'{proj[6]}', 1, GETUTCDATE());\n")
            f.write("SET IDENTITY_INSERT LaborProjects OFF;\nGO\n\n")

            f.write("-- 7. Insert Prisoners\n")
            f.write("PRINT 'Seeding Prisoners...';\n")
            f.write("SET IDENTITY_INSERT Prisoners ON;\n")
            for p in raw_prisoners:
                loc = p[6] if p[6] else "NULL"
                f.write(f"INSERT INTO Prisoners (PrisonerID, FullName, DateOfBirth, Gender, CrimeType, RiskLevel, ProductivityScore, RehabHours, CurrentLocationID, SentenceStart, SentenceEnd, Status, CreatedAt) "
                        f"VALUES ({p[0]}, N'{p[1]}', '{p[2]}', '{p[3]}', N'{p[4]}', '{p[5]}', {p[9]}, {24 + (p[0]-1)*2}, {loc}, '{p[7]}', '{p[8]}', 'InPrison', GETUTCDATE());\n")
            f.write("SET IDENTITY_INSERT Prisoners OFF;\nGO\n\n")

            f.write("-- 8. Insert LaborAssignments\n")
            f.write("PRINT 'Seeding LaborAssignments...';\n")
            for a in raw_assignments:
                f.write(f"INSERT INTO LaborAssignments (PrisonerID, ProjectID, AssignedBy, AssignmentDate, HoursAssigned, CreatedAt) "
                        f"VALUES ({a[0]}, {a[1]}, {a[2]}, CAST(GETDATE() AS DATE), {a[3]}, GETUTCDATE());\n")
            f.write("GO\n\n")

            f.write("-- 9. Insert DailyPerformance\n")
            f.write("PRINT 'Seeding DailyPerformance...';\n")
            for dp in raw_performances:
                f.write(f"INSERT INTO DailyPerformance (PrisonerID, ProjectID, EvaluatedBy, WorkDate, Productivity, Notes, CreatedAt) "
                        f"VALUES ({dp[0]}, {dp[1]}, {dp[2]}, DATEADD(day, -1, CAST(GETDATE() AS DATE)), {dp[3]}, N'{dp[4]}', GETUTCDATE());\n")
            f.write("GO\n\n")

            f.write("-- 10. Insert Incidents\n")
            f.write("PRINT 'Seeding Incidents...';\n")
            for inc in raw_incidents:
                f.write(f"INSERT INTO Incidents (PrisonerID, LocationID, IncidentDate, IncidentType, Severity, PenaltyPoints, Description, CreatedBy, CreatedAt) "
                        f"VALUES ({inc[0]}, {inc[1]}, DATEADD(day, -3, GETDATE()), N'{inc[2]}', '{inc[3]}', {inc[4]}, N'{inc[5]}', {inc[6]}, GETUTCDATE());\n")
            f.write("GO\n\n")

            f.write("-- 11. Insert Visits & VisitRequests\n")
            f.write("PRINT 'Seeding Visits & Requests...';\n")
            for vi in raw_visits:
                approved_val = vi[3] if vi[3] is not None else "NULL"
                f.write(f"INSERT INTO Visits (PrisonerID, VisitorName, VisitDate, Status, ApprovedBy, Notes, CreatedAt) "
                        f"VALUES ({vi[0]}, N'{vi[1]}', DATEADD(day, 2, GETDATE()), '{vi[2]}', {approved_val}, N'{vi[4]}', GETUTCDATE());\n")
            for vr in raw_visit_requests:
                f.write(f"INSERT INTO VisitRequests (PrisonerID, ViewerID, RequestedDate, Status, CreatedAt) "
                        f"VALUES ({vr[0]}, {vr[1]}, DATEADD(day, -2, GETDATE()), '{vr[2]}', GETUTCDATE());\n")
            f.write("GO\n\n")

            f.write("-- 12. Insert Schedules\n")
            f.write("PRINT 'Seeding Schedules...';\n")
            for s in schedules_list:
                proj = s.project_id if s.project_id else "NULL"
                loc = s.location_id if s.location_id else "NULL"
                start_str = s.start_time.strftime("%Y-%m-%d %H:%M:%S")
                end_str = s.end_time.strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"INSERT INTO Schedules (PrisonerID, ProjectID, LocationID, ShiftID, StartTime, EndTime, Status, CreatedAt) "
                        f"VALUES ({s.prisoner_id}, {proj}, {loc}, {s.shift_id}, '{start_str}', '{end_str}', 'Active', GETUTCDATE());\n")
            f.write("GO\n\n")
            
            f.write("PRINT 'Database successfully seeded!';\n")
            
        print("SQL dump script created at backend/sql/seed_logical_data.sql")
        print("Database successfully seeded in Python session!")

    except Exception as e:
        db.rollback()
        sys.stderr.write(f"Error seeding database: {str(e)}\n")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
