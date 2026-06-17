-- ============================================================
-- File: 05_Grant_Permissions.sql
-- Mục đích: Cấp quyền cho 4 Database Roles
-- Chạy sau File 04 (Views đã tạo)
-- ============================================================

USE PRISON;
GO

PRINT '=== Bắt đầu cấp quyền cho các Database Roles ===';
GO

-- ============================================================
-- 1. db_role_viewer - Quyền hạn chế nhất (Thân nhân)
-- ============================================================
PRINT '--- Cấp quyền cho db_role_viewer ---';

GRANT SELECT ON dbo.vw_Prisoners_Basic      TO db_role_viewer;
GRANT SELECT ON dbo.vw_Visits_Basic         TO db_role_viewer;
GRANT SELECT ON dbo.vw_Incidents_Basic      TO db_role_viewer;
GRANT SELECT ON dbo.vw_LaborProjects_Basic  TO db_role_viewer;
GRANT SELECT ON dbo.vw_Locations_Basic      TO db_role_viewer;

-- Từ chối truy cập trực tiếp vào bảng gốc (bảo mật)
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.Prisoners        TO db_role_viewer;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.Visits           TO db_role_viewer;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.Incidents        TO db_role_viewer;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.LaborProjects    TO db_role_viewer;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.DailyPerformance TO db_role_viewer;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.Users            TO db_role_viewer;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.AuditLog         TO db_role_viewer;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.Schedules        TO db_role_viewer;

PRINT 'Đã cấp quyền cho db_role_viewer (chỉ qua View)';
GO

-- ============================================================
-- 2. db_role_guard - Cảnh sát quản giáo
-- ============================================================
PRINT '--- Cấp quyền cho db_role_guard ---';

GRANT SELECT ON dbo.Prisoners        TO db_role_guard;
GRANT SELECT ON dbo.Visits           TO db_role_guard;
GRANT SELECT ON dbo.Incidents        TO db_role_guard;
GRANT SELECT ON dbo.LaborProjects    TO db_role_guard;
GRANT SELECT ON dbo.Locations        TO db_role_guard;
GRANT SELECT ON dbo.DailyPerformance TO db_role_guard;
GRANT SELECT ON dbo.Schedules        TO db_role_guard;

-- Quyền tạo/sửa (không được xóa)
GRANT INSERT, UPDATE ON dbo.DailyPerformance TO db_role_guard;
GRANT INSERT, UPDATE ON dbo.Incidents        TO db_role_guard;
GRANT INSERT, UPDATE ON dbo.Visits           TO db_role_guard;

-- Không cho xóa
DENY DELETE ON dbo.Prisoners        TO db_role_guard;
DENY DELETE ON dbo.Incidents        TO db_role_guard;
DENY DELETE ON dbo.Visits           TO db_role_guard;

PRINT 'Đã cấp quyền cho db_role_guard';
GO

-- ============================================================
-- 3. db_role_warden - Quản lý trại
-- ============================================================
PRINT '--- Cấp quyền cho db_role_warden ---';

-- Quyền rộng trên dữ liệu nghiệp vụ
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Prisoners        TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Visits           TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Incidents        TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.LaborProjects    TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Locations        TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.DailyPerformance TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Schedules        TO db_role_warden;

-- Không được chạm vào Users và AuditLog
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.Users    TO db_role_warden;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.AuditLog TO db_role_warden;

PRINT 'Đã cấp quyền cho db_role_warden';
GO

-- ============================================================
-- 4. db_role_admin - Quyền cao nhất
-- ============================================================
PRINT '--- Cấp quyền cho db_role_admin ---';

-- Admin có quyền CONTROL trên toàn schema
GRANT CONTROL ON SCHEMA::dbo TO db_role_admin;

-- Vẫn hạn chế xóa một số bảng nhạy cảm
DENY DELETE ON dbo.Users    TO db_role_admin;
DENY DELETE ON dbo.AuditLog TO db_role_admin;

PRINT 'Đã cấp quyền cho db_role_admin';
GO

-- ============================================================
-- KẾT THÚC
-- ============================================================
PRINT '
================================================================================
PHÂN QUYỀN DATABASE HOÀN TẤT
================================================================================

Tóm tắt:
- Viewer   : Chỉ SELECT qua View (rất hạn chế)
- Guard    : Xem + Tạo/Sửa một số bảng, không xóa
- Warden   : Quyền rộng trên dữ liệu nghiệp vụ
- Admin    : Quyền cao nhất (CONTROL), nhưng không xóa Users/AuditLog

Hướng dẫn gán Role cho User:
   ALTER ROLE db_role_viewer  ADD MEMBER [username];
   ALTER ROLE db_role_guard   ADD MEMBER [username];
   ...
================================================================================
';
GO