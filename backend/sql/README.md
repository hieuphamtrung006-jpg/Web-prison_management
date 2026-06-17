# Prison Management System - Database Setup Guide

## Giới thiệu
Hệ thống cơ sở dữ liệu cho **Trung tâm Chỉ huy Hoạt động Nhà tù** (Prison Command Center).

Hệ thống hỗ trợ phân quyền chặt chẽ theo 4 vai trò:
- **Admin** (Quản trị viên)
- **Warden** (Quản lý trại)
- **Guard** (Cảnh sát quản giáo)
- **Viewer** (Thân nhân phạm nhân - quyền hạn chế)

## Cấu trúc 5 File Setup (Bắt buộc chạy theo thứ tự)

| Thứ tự | File | Mục đích |
|--------|------|----------|
| 1 | `01_Create_Database_and_Tables.sql` | Tạo database + toàn bộ bảng + Foreign Key + Index |
| 2 | `02_Create_AuditLog_and_Triggers.sql` | Tạo bảng AuditLog + 4 Triggers (bao gồm trigger bảo vệ bảng Users) |
| 3 | `03_Create_Database_Roles.sql` | Tạo 4 Database Roles (`db_role_admin`, `db_role_warden`, `db_role_guard`, `db_role_viewer`) |
| 4 | `04_Create_Views_for_Viewer.sql` | Tạo các View hạn chế cho role Viewer |
| 5 | `05_Grant_Permissions.sql` | Cấp quyền (GRANT/DENY) cho từng role |

## Hướng dẫn sử dụng cho người mới

### Bước 1: Chuẩn bị
- Cài đặt **SQL Server 2019** trở lên (khuyến nghị 2022).
- Mở **SQL Server Management Studio (SSMS)**.
- Kết nối với quyền **sysadmin**.

### Bước 2: Chạy 5 file theo đúng thứ tự
1. Mở file `01_Create_Database_and_Tables.sql` → Execute (F5).
2. Mở file `02_Create_AuditLog_and_Triggers.sql` → Execute.
3. Mở file `03_Create_Database_Roles.sql` → Execute.
4. Mở file `04_Create_Views_for_Viewer.sql` → Execute.
5. Mở file `05_Grant_Permissions.sql` → Execute.

**Lưu ý quan trọng**: 
- Phải chạy đúng thứ tự.
- Sau khi chạy xong, database `PRISON` sẽ được tạo sạch.

### Bước 3: Tạo User và gán Role (Quan trọng)

Sau khi có database, bạn cần tạo Login + User rồi gán vào Role:

```sql
-- Ví dụ tạo user cho Admin
CREATE LOGIN admin_user WITH PASSWORD = 'YourStrongPassword123!';
CREATE USER admin_user FOR LOGIN admin_user;
ALTER ROLE db_role_admin ADD MEMBER admin_user;

-- Ví dụ tạo user cho Viewer (thân nhân)
CREATE LOGIN viewer_user WITH PASSWORD = 'YourStrongPassword123!';
CREATE USER viewer_user FOR LOGIN viewer_user;
ALTER ROLE db_role_viewer ADD MEMBER viewer_user;
```

### Bước 4: Reset dữ liệu (khi cần test lại)

Chạy file `06_Reset_Data.sql` để xóa toàn bộ dữ liệu và reset Identity về 1.

### Bước 5: Insert dữ liệu test ban đầu

Chạy file `07_Insert_Initial_Data.sql` để có dữ liệu mẫu sạch để test.

---

## Cấu trúc Insert Dữ liệu (Hướng dẫn chi tiết)

### 1. Bảng Users (Bắt buộc có ít nhất 1 Admin)

```sql
INSERT INTO Users (Username, PasswordHash, FullName, Role, Email, Phone, IsActive)
VALUES 
('admin', '$2b$12$...', N'Nguyễn Quốc Khánh', 'Admin', 'admin@prison.gov.vn', '0912345678', 1),
('warden', '$2b$12$...', N'Lê Hữu Đạt', 'Warden', 'warden@prison.gov.vn', '0987654321', 1),
('guard', '$2b$12$...', N'Nguyễn Minh Tuấn', 'Guard', 'guard@prison.gov.vn', '0901234567', 1),
('viewer', '$2b$12$...', N'Phạm Thùy Linh', 'Viewer', 'viewer@prison.gov.vn', '0934567890', 1);
```

**Lưu ý**: 
- `PasswordHash` phải là bcrypt hash (khuyến nghị dùng code backend để hash).
- Role phải đúng: `Admin`, `Warden`, `Guard`, `Viewer`.

### 2. Bảng Locations (Cơ sở vật chất)

```sql
INSERT INTO Locations (LocationName, Type, Capacity, SecurityLevel, IsActive)
VALUES 
(N'Buồng giam Tập thể C-15', 'Cell', 20, 'medium', 1),
(N'Xưởng gia công đồ gỗ', 'Workshop', 30, 'medium', 1),
(N'Khu nông nghiệp chăn nuôi', 'Workshop', 40, 'low', 1);
```

### 3. Bảng Prisoners (Tù nhân)

```sql
INSERT INTO Prisoners (FullName, DateOfBirth, Gender, CrimeType, RiskLevel, CurrentLocationID, SentenceStart, SentenceEnd, Status)
VALUES 
(N'Trần Văn An', '1990-05-12', 'Male', N'Trộm cắp tài sản', 'Low', 1, '2024-01-10', '2027-01-10', 'InPrison'),
(N'Nguyễn Thị Bình', '1988-11-23', 'Female', N'Lừa đảo chiếm đoạt tài sản', 'Low', 2, '2023-05-15', '2028-05-15', 'InPrison');
```

### 4. Bảng LaborProjects (Dự án lao động)

```sql
INSERT INTO LaborProjects (ProjectName, LocationID, RevenuePerHour, MaxWorkers, RequiredSkills, IsActive)
VALUES 
(N'Gia công bàn ghế gỗ xuất khẩu', 6, 15.00, 30, N'Khéo tay, chịu lực tốt', 1),
(N'May trang phục bảo hộ lao động', 7, 12.00, 10, N'Tỉ mỉ, khéo léo', 1);
```

### 5. Bảng VisitRequests (Yêu cầu thăm gặp - quan trọng với Viewer)

```sql
INSERT INTO VisitRequests (PrisonerID, ViewerID, RequestedDate, Status)
VALUES 
(1, 4, '2026-06-20', 'Pending'),   -- Viewer gửi yêu cầu
(2, 4, '2026-06-25', 'Approved');
```

---

## Lưu ý bảo mật & RBAC

- **Trigger bảo vệ Users**: Chỉ role `Admin` mới được UPDATE/DELETE trên bảng Users.
- **View cho Viewer**: 
  - `vw_Prisoners_Basic` chỉ hiển thị thông tin tối thiểu.
  - Viewer **không được** SELECT trực tiếp trên bảng gốc.
- **Audit Log**: Tự động ghi lại mọi thay đổi (INSERT/UPDATE/DELETE) trên Prisoners, Visits, Incidents.

---

## File hỗ trợ

- `06_Reset_Data.sql` → Xóa toàn bộ dữ liệu test.
- `07_Insert_Initial_Data.sql` → Dữ liệu mẫu sạch để test nhanh.

---

**Tác giả**: Prison Command Team  
**Phiên bản**: 2026-06-17 (Đã loại bỏ LaborAssignments, thu hẹp View cho Viewer)
```