-- ============================================================
-- File: 03_Create_Database_Roles.sql
-- Mục đích: Tạo 4 Database Roles tương ứng với các role trong ứng dụng
-- Chạy sau File 01 (sau khi đã tạo các bảng)
-- ============================================================

USE PRISON;
GO

PRINT '=== Bắt đầu tạo Database Roles ===';
GO

-- ============================================================
-- db_role_admin - Quyền cao nhất
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_role_admin' AND type = 'R')
BEGIN
    CREATE ROLE db_role_admin;
    PRINT 'Created role: db_role_admin';
END
ELSE
    PRINT 'Role db_role_admin already exists.';

-- ============================================================
-- db_role_warden - Quản lý trại giam
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_role_warden' AND type = 'R')
BEGIN
    CREATE ROLE db_role_warden;
    PRINT 'Created role: db_role_warden';
END
ELSE
    PRINT 'Role db_role_warden already exists.';

-- ============================================================
-- db_role_guard - Cảnh sát quản giáo
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_role_guard' AND type = 'R')
BEGIN
    CREATE ROLE db_role_guard;
    PRINT 'Created role: db_role_guard';
END
ELSE
    PRINT 'Role db_role_guard already exists.';

-- ============================================================
-- db_role_viewer - Thân nhân phạm nhân (quyền hạn chế nhất)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_role_viewer' AND type = 'R')
BEGIN
    CREATE ROLE db_role_viewer;
    PRINT 'Created role: db_role_viewer';
END
ELSE
    PRINT 'Role db_role_viewer already exists.';

PRINT '=== Đã tạo xong 4 Database Roles ===';
GO

PRINT '
================================================================================
Hướng dẫn sử dụng sau khi tạo Role:

1. Tạo Login và User trong SQL Server
2. Thêm User vào Role tương ứng, ví dụ:
   ALTER ROLE db_role_admin   ADD MEMBER [ten_user];
   ALTER ROLE db_role_warden  ADD MEMBER [ten_user];
   ALTER ROLE db_role_guard   ADD MEMBER [ten_user];
   ALTER ROLE db_role_viewer  ADD MEMBER [ten_user];

Lưu ý: 
- db_role_viewer sẽ chỉ được cấp quyền qua các View (File 04)
- db_role_admin có quyền mạnh nhất nhưng vẫn bị hạn chế xóa User qua Trigger
================================================================================
';
GO