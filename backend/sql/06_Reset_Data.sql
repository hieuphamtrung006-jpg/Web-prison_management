-- ============================================================
-- File: 06_Reset_Data.sql
-- Mục đích: Xóa toàn bộ dữ liệu test (giữ nguyên cấu trúc bảng, trigger, view, role)
-- Chạy khi muốn reset database để test lại từ đầu
-- ============================================================

USE PRISON;
GO

PRINT '=== BẮT ĐẦU RESET TOÀN BỘ DỮ LIỆU ===';
GO

-- Tắt kiểm tra Foreign Key tạm thời
EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL";
GO

-- Xóa dữ liệu theo thứ tự từ bảng con đến bảng cha
DELETE FROM DailyPerformance;
DELETE FROM Schedules;
DELETE FROM Incidents;
DELETE FROM Visits;
DELETE FROM VisitRequests;
DELETE FROM LaborProjects;
DELETE FROM Prisoners;
DELETE FROM AuditLog;
DELETE FROM Users;
GO

-- Bật lại Foreign Key
EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL";
GO

-- Reset Identity về 1 cho tất cả bảng
DBCC CHECKIDENT ('Users', RESEED, 0);
DBCC CHECKIDENT ('Prisoners', RESEED, 0);
DBCC CHECKIDENT ('Locations', RESEED, 0);
DBCC CHECKIDENT ('LaborProjects', RESEED, 0);
DBCC CHECKIDENT ('Incidents', RESEED, 0);
DBCC CHECKIDENT ('Visits', RESEED, 0);
DBCC CHECKIDENT ('VisitRequests', RESEED, 0);
DBCC CHECKIDENT ('DailyPerformance', RESEED, 0);
DBCC CHECKIDENT ('Schedules', RESEED, 0);
DBCC CHECKIDENT ('AuditLog', RESEED, 0);
GO

PRINT '=== ĐÃ RESET DỮ LIỆU THÀNH CÔNG ===';
PRINT 'Tất cả bảng đã trống và Identity đã reset về 1.';
GO
```