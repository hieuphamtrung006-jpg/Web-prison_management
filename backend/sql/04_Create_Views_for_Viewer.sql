-- ============================================================
-- File: 04_Create_Views_for_Viewer.sql
-- Mục đích: Tạo các View GIỚI HẠN cho role Viewer (thân nhân)
-- Viewer chỉ được xem dữ liệu tối thiểu, không được xem toàn bộ tù nhân
-- ============================================================

USE PRISON;
GO

PRINT '=== Bắt đầu tạo Views cho role Viewer (phiên bản hạn chế) ===';
GO

-- ============================================================
-- View 1: vw_Prisoners_Basic - RẤT HẠN CHẾ
-- ============================================================
IF OBJECT_ID('dbo.vw_Prisoners_Basic', 'V') IS NOT NULL
    DROP VIEW dbo.vw_Prisoners_Basic;
GO

CREATE VIEW dbo.vw_Prisoners_Basic AS
SELECT 
    PrisonerID,
    FullName,
    Gender,
    RiskLevel,
    Status,
    CurrentLocationID
    -- CHỈ giữ thông tin tối thiểu cần thiết cho thân nhân
    -- Ẩn hoàn toàn: DateOfBirth, CrimeType, SentenceStart, SentenceEnd, ProductivityScore, RehabHours
FROM dbo.Prisoners;
GO

PRINT 'Created View: vw_Prisoners_Basic (hạn chế)';
GO

-- ============================================================
-- View 2: vw_Visits_Basic - Chỉ xem được của chính mình (sẽ filter ở backend)
-- ============================================================
IF OBJECT_ID('dbo.vw_Visits_Basic', 'V') IS NOT NULL
    DROP VIEW dbo.vw_Visits_Basic;
GO

CREATE VIEW dbo.vw_Visits_Basic AS
SELECT 
    VisitID,
    PrisonerID,
    VisitorName,
    VisitDate,
    Status,
    ApprovedBy,
    CreatedAt,
    UpdatedAt
FROM dbo.Visits;
GO

PRINT 'Created View: vw_Visits_Basic';
GO


-- ============================================================
-- View 3: vw_LaborProjects_Basic - Giữ nguyên (công khai)
-- ============================================================
IF OBJECT_ID('dbo.vw_LaborProjects_Basic', 'V') IS NOT NULL
    DROP VIEW dbo.vw_LaborProjects_Basic;
GO

CREATE VIEW dbo.vw_LaborProjects_Basic AS
SELECT 
    LP.ProjectID,
    LP.ProjectName,
    LP.LocationID,
    L.LocationName,
    LP.RevenuePerHour,
    LP.MaxWorkers,
    LP.IsActive
FROM dbo.LaborProjects LP
LEFT JOIN dbo.Locations L ON L.LocationID = LP.LocationID;
GO

PRINT 'Created View: vw_LaborProjects_Basic';
GO

-- ============================================================
-- View 4: vw_Locations_Basic - Giữ nguyên
-- ============================================================
IF OBJECT_ID('dbo.vw_Locations_Basic', 'V') IS NOT NULL
    DROP VIEW dbo.vw_Locations_Basic;
GO

CREATE VIEW dbo.vw_Locations_Basic AS
SELECT 
    LocationID,
    LocationName,
    Type,
    Capacity,
    SecurityLevel,
    IsActive
FROM dbo.Locations;
GO

PRINT 'Created View: vw_Locations_Basic';
GO

PRINT '
=== ĐÃ TẠO XONG VIEWS CHO VIEWER ===
- vw_Prisoners_Basic: Chỉ còn ID, Tên, Giới tính, Rủi ro, Trạng thái
- Các view khác giữ ở mức tối thiểu cần thiết
';
GO