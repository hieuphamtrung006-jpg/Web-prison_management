-- ============================================================
-- File: 05_Grant_Permissions.sql
-- Mục đích: Cấp quyền cho các Database Roles
-- Chạy sau khi đã tạo Roles (File 03) và Views (File 04)
-- ============================================================

USE PRISON;
GO

PRINT '=== Bắt đầu cấp quyền cho các Database Roles ===';
GO

-- ============================================================
-- 1. db_role_viewer (Chỉ được xem qua View)
-- ============================================================
PRINT '--- Cấp quyền cho db_role_viewer ---';

-- Viewer chỉ được SELECT trên các View
GRANT SELECT ON dbo.vw_Prisoners_Basic TO db_role_viewer;
GRANT SELECT ON dbo.vw_Visits_Basic TO db_role_viewer;
GRANT SELECT ON dbo.vw_Incidents_Basic TO db_role_viewer;
GRANT SELECT ON dbo.vw_LaborAssignments_Basic TO db_role_viewer;
GRANT SELECT ON dbo.vw_DailyPerformance_Basic TO db_role_viewer;
GRANT SELECT ON dbo.vw_Locations_Basic TO db_role_viewer;

-- Từ chối truy cập trực tiếp vào các bảng gốc (quan trọng)
DENY SELECT ON dbo.Prisoners TO db_role_viewer;
DENY SELECT ON dbo.Visits TO db_role_viewer;
DENY SELECT ON dbo.Incidents TO db_role_viewer;
DENY SELECT ON dbo.LaborAssignments TO db_role_viewer;
DENY SELECT ON dbo.DailyPerformance TO db_role_viewer;
DENY SELECT ON dbo.Users TO db_role_viewer;
DENY SELECT ON dbo.AuditLog TO db_role_viewer;

PRINT 'Đã cấp quyền cho db_role_viewer';


-- ============================================================
-- 2. db_role_guard
-- ============================================================
PRINT '--- Cấp quyền cho db_role_guard ---';

-- Guard được xem hầu hết dữ liệu
GRANT SELECT ON dbo.Prisoners TO db_role_guard;
GRANT SELECT ON dbo.Visits TO db_role_guard;
GRANT SELECT ON dbo.Incidents TO db_role_guard;
GRANT SELECT ON dbo.LaborAssignments TO db_role_guard;
GRANT SELECT ON dbo.DailyPerformance TO db_role_guard;
GRANT SELECT ON dbo.LaborProjects TO db_role_guard;
GRANT SELECT ON dbo.Locations TO db_role_guard;

-- Guard được tạo/sửa một số bảng chính
GRANT INSERT, UPDATE ON dbo.LaborAssignments TO db_role_guard;
GRANT INSERT, UPDATE ON dbo.DailyPerformance TO db_role_guard;
GRANT INSERT, UPDATE ON dbo.Incidents TO db_role_guard;
GRANT INSERT, UPDATE ON dbo.Visits TO db_role_guard;

-- Guard không được xóa
DENY DELETE ON dbo.Prisoners TO db_role_guard;
DENY DELETE ON dbo.Visits TO db_role_guard;
DENY DELETE ON dbo.Incidents TO db_role_guard;

PRINT 'Đã cấp quyền cho db_role_guard';


-- ============================================================
-- 3. db_role_warden
-- ============================================================
PRINT '--- Cấp quyền cho db_role_warden ---';

-- Warden có quyền rộng hơn Guard
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Prisoners TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Visits TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Incidents TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.LaborAssignments TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.DailyPerformance TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.LaborProjects TO db_role_warden;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Locations TO db_role_warden;

-- Warden không được chạm vào bảng Users và AuditLog
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.Users TO db_role_warden;
DENY SELECT, INSERT, UPDATE, DELETE ON dbo.AuditLog TO db_role_warden;

PRINT 'Đã cấp quyền cho db_role_warden';


-- ============================================================
-- 4. db_role_admin (Quyền cao nhất)
-- ============================================================
PRINT '--- Cấp quyền cho db_role_admin ---';

-- Admin có quyền gần như đầy đủ trên các bảng nghiệp vụ
GRANT CONTROL ON SCHEMA::dbo TO db_role_admin;

-- Tuy nhiên vẫn nên hạn chế một số bảng cực kỳ nhạy cảm
DENY DELETE ON dbo.Users TO db_role_admin;
DENY DELETE ON dbo.AuditLog TO db_role_admin;

PRINT 'Đã cấp quyền cho db_role_admin';


-- ============================================================
-- Kết thúc
-- ============================================================
PRINT '
================================================================================
PHÂN QUYỀN HOÀN TẤT
================================================================================

Tóm tắt quyền:

- db_role_viewer : Chỉ SELECT trên View (không được xem bảng gốc)
- db_role_guard  : SELECT + INSERT + UPDATE một số bảng (không được DELETE)
- db_role_warden : Quyền rộng (có thể DELETE), nhưng không chạm Users & AuditLog
- db_role_admin  : Quyền cao nhất trong schema dbo

Lưu ý quan trọng:
- Sau khi tạo User trong SQL Server, hãy thêm User đó vào đúng Database Role.
  Ví dụ:
    ALTER ROLE db_role_viewer ADD MEMBER [tên_user_trong_sql];
================================================================================
';
GO