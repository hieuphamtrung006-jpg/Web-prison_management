# Prison Management System

## Requirements
- Python 3.11+
- Node.js 18+
- SQL Server (local) + ODBC Driver 18

## Quick Start
1) Clone the repo.
2) Create env files:
   - Copy backend/.env.example -> backend/.env
   - Copy frontend/.env.example -> frontend/.env
3) Update backend/.env:
   - DATABASE_URL (SQL Server connection)
   - JWT_SECRET_KEY
   - CORS_ORIGINS (use http://localhost:5173,http://127.0.0.1:5173)
4) Install backend deps:
   - From backend/: pip install -r requirements.txt
5) Install frontend deps:
   - From frontend/: npm install
6) Start fullstack:
   - From repo root: .\run-fullstack.ps1

## Cập nhật mới nhất & Hướng dẫn Deploy

### 1. Các cập nhật chính (Latest Updates)
* **Trạng thái ca làm việc động (Dynamic Shifts)**: Cột "Staff only/Trạng thái" trong bảng Ca làm việc tự động hiển thị `Đang hoạt động (Active)` hoặc `Không hoạt động` theo thời gian thực (real-time) dựa vào đồng hồ hệ thống.
* **Cập nhật real-time cho Địa điểm & Dự án**:
  - Số lượng tù nhân `Đang ở` tại mỗi Địa điểm và số công nhân `Current Workers` tại các Dự án lao động được tính toán động theo thời gian thực dựa trên các lịch trình (schedules) đang hoạt động.
  - Sửa lỗi lệch ngày cho ca trực đêm đi xuyên qua nửa đêm (Midnight-crossing Shift) trong bộ tối ưu thuật toán sinh lịch tự động.
* **Tối ưu hóa trang Lịch trình (Schedules)**:
  - Loại bỏ bảng gộp lịch trình hàng ngày (Daily Grouped Schedule) để tránh xung đột dữ liệu.
  - Hỗ trợ nhập định dạng ngày linh hoạt (`DD/MM/YYYY`, `DD/MM`, hoặc `YYYY-MM-DD`) tại bộ Generator.
  - Loại bỏ hoàn toàn nút và modal **Create Schedule** thủ công vì lịch trình đã được quản lý tập trung và tối ưu tự động từ Generator.
  - Ẩn cột Sidebar hành động khi trống giúp mở rộng diện tích bảng lịch trình tối đa.
* **Phân quyền vai trò Viewer**: Ẩn các cột/filters về Địa điểm của tù nhân đối với tài khoản vai trò `Viewer` để bảo mật thông tin.

---

### 2. Hướng dẫn cập nhật Database (Database Deployment)

Để đồng nghiệp khi pull code về chạy được ngay và đồng bộ toàn bộ cấu trúc bảng, phân quyền Viewer và dữ liệu mẫu chuẩn:

#### Cách 1: Sử dụng Python Seed Script (Khuyên dùng - Nhanh nhất)
Từ thư mục root của dự án, chạy lệnh sau:
```bash
python backend/seed_logical_data.py
```
*Lệnh này sẽ tự động xóa bảng cũ, tạo lại cấu trúc mới, áp dụng cấu hình và nạp dữ liệu mẫu chuẩn (bao gồm 30 tù nhân và lịch trình real-time của ngày hôm nay).*

#### Cách 2: Chạy thủ công bằng SQL Server Management Studio (SSMS)
Chạy tuần tự các file SQL trong thư mục `backend/sql/` theo thứ tự sau:
1. [01_Create_Database_and_Tables.sql](file:///C:/Users/Admin/Documents/WEB/Web-prison_management/backend/sql/01_Create_Database_and_Tables.sql) - Tạo Database và các bảng.
2. [02_Create_AuditLog_and_Triggers.sql](file:///C:/Users/Admin/Documents/WEB/Web-prison_management/backend/sql/02_Create_AuditLog_and_Triggers.sql) - Tạo bảng Audit và Triggers ghi vết log.
3. [03_Create_Database_Roles.sql](file:///C:/Users/Admin/Documents/WEB/Web-prison_management/backend/sql/03_Create_Database_Roles.sql) - Khởi tạo các Database Roles.
4. [04_Create_Views_for_Viewer.sql](file:///C:/Users/Admin/Documents/WEB/Web-prison_management/backend/sql/04_Create_Views_for_Viewer.sql) - Khởi tạo các Views bảo mật cho vai trò Viewer.
5. [05_Grant_Permissions.sql](file:///C:/Users/Admin/Documents/WEB/Web-prison_management/backend/sql/05_Grant_Permissions.sql) - Cấp quyền truy cập trên Views cho database users.
6. [seed_logical_data.sql](file:///C:/Users/Admin/Documents/WEB/Web-prison_management/backend/sql/seed_logical_data.sql) - Nạp dữ liệu mẫu và lịch trình thực tế.

---

### 3. Vận hành dự án (Running the Project)
1. Cấu hình file `.env` ở cả thư mục `backend/` và `frontend/` (xem ví dụ trong `.env.example`).
2. Khởi chạy toàn bộ hệ thống bằng PowerShell tại thư mục root:
   ```powershell
   .\run-fullstack.ps1
   ```
3. Backend docs: `http://127.0.0.1:8000/docs`
4. Frontend app: `http://127.0.0.1:5173`
   * *Tài khoản test: `admin` / `admin123`, `warden` / `warden123`, `guard` / `guard123`, `viewer` / `viewer123`*

