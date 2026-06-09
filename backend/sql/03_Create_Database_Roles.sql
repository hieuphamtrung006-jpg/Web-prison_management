-- ============================================================
-- File: 03_Create_Database_Roles.sql
-- Mục đích: Tạo 4 Database Roles tương ứng với các role trong ứng dụng
-- Chạy sau khi đã có database và bảng
-- ============================================================

USE PRISON;
GO

PRINT '=== Bắt đầu tạo Database Roles ===';
GO

-- Tạo role Admin
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_role_admin' AND type = 'R')
BEGIN
    CREATE ROLE db_role_admin;
    PRINT 'Created role: db_role_admin';
END
ELSE
    PRINT 'Role db_role_admin already exists.';

-- Tạo role Warden
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_role_warden' AND type = 'R')
BEGIN
    CREATE ROLE db_role_warden;
    PRINT 'Created role: db_role_warden';
END
ELSE
    PRINT 'Role db_role_warden already exists.';

-- Tạo role Guard
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_role_guard' AND type = 'R')
BEGIN
    CREATE ROLE db_role_guard;
    PRINT 'Created role: db_role_guard';
END
ELSE
    PRINT 'Role db_role_guard already exists.';

-- Tạo role Viewer (quan trọng nhất cần hạn chế)
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'db_role_viewer' AND type = 'R')
BEGIN
    CREATE ROLE db_role_viewer;
    PRINT 'Created role: db_role_viewer';
END
ELSE
    PRINT 'Role db_role_viewer already exists.';

PRINT '=== Đã tạo xong 4 Database Roles ===';
GO