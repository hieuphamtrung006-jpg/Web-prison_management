-- ============================================================
-- File: 04_Create_Views_for_Viewer.sql
-- Mục đích: Tạo các View cho role Viewer (chỉ cho xem dữ liệu đã lọc)
-- Viewer KHÔNG được SELECT trực tiếp trên các bảng gốc
-- ============================================================

USE PRISON;
GO

PRINT '=== Bắt đầu tạo View cho role Viewer ===';
GO

-- ============================================================
-- View 1: Prisoners (Ẩn thông tin nhạy cảm)
-- ============================================================
IF OBJECT_ID('dbo.vw_Prisoners_Basic', 'V') IS NOT NULL
    DROP VIEW dbo.vw_Prisoners_Basic;
GO

CREATE VIEW dbo.vw_Prisoners_Basic AS
SELECT 
    PrisonerID,
    FullName,
    DateOfBirth,
    Gender,
    RiskLevel,
    ProductivityScore,
    RehabHours,
    CurrentLocationID,
    Status,
    CreatedAt,
    UpdatedAt
    -- Ẩn: CrimeType, SentenceStart, SentenceEnd (thông tin nhạy cảm)
FROM dbo.Prisoners;
GO

PRINT 'Created View: vw_Prisoners_Basic';


-- ============================================================
-- View 2: Visits (Ẩn Notes)
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
    -- Ẩn: Notes (có thể chứa thông tin nhạy cảm)
FROM dbo.Visits;
GO

PRINT 'Created View: vw_Visits_Basic';


-- ============================================================
-- View 3: Incidents (Ẩn Description và PenaltyPoints)
-- ============================================================
IF OBJECT_ID('dbo.vw_Incidents_Basic', 'V') IS NOT NULL
    DROP VIEW dbo.vw_Incidents_Basic;
GO

CREATE VIEW dbo.vw_Incidents_Basic AS
SELECT 
    IncidentID,
    PrisonerID,
    LocationID,
    IncidentDate,
    IncidentType,
    Severity,
    CreatedBy,
    CreatedAt
    -- Ẩn: Description, PenaltyPoints (thông tin nhạy cảm)
FROM dbo.Incidents;
GO

PRINT 'Created View: vw_Incidents_Basic';


-- ============================================================
-- View 4: LaborAssignments
-- ============================================================
IF OBJECT_ID('dbo.vw_LaborAssignments_Basic', 'V') IS NOT NULL
    DROP VIEW dbo.vw_LaborAssignments_Basic;
GO

CREATE VIEW dbo.vw_LaborAssignments_Basic AS
SELECT 
    AssignmentID,
    PrisonerID,
    ProjectID,
    AssignedBy,
    AssignmentDate,
    HoursAssigned,
    CreatedAt,
    UpdatedAt
FROM dbo.LaborAssignments;
GO

PRINT 'Created View: vw_LaborAssignments_Basic';


-- ============================================================
-- View 5: DailyPerformance (ẩn Notes)
-- ============================================================
IF OBJECT_ID('dbo.vw_DailyPerformance_Basic', 'V') IS NOT NULL
    DROP VIEW dbo.vw_DailyPerformance_Basic;
GO

CREATE VIEW dbo.vw_DailyPerformance_Basic AS
SELECT 
    PerformanceID,
    PrisonerID,
    ProjectID,
    EvaluatedBy,
    WorkDate,
    Productivity,
    CreatedAt
    -- Ẩn: Notes
FROM dbo.DailyPerformance;
GO

PRINT 'Created View: vw_DailyPerformance_Basic';


-- ============================================================
-- View 6: Locations (cho phép xem đầy đủ vì ít nhạy cảm)
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
    IsActive,
    CreatedAt,
    UpdatedAt
FROM dbo.Locations;
GO

PRINT 'Created View: vw_Locations_Basic';

PRINT '
=== Đã tạo xong các View cho Viewer ===
Các View đã tạo:
- vw_Prisoners_Basic
- vw_Visits_Basic
- vw_Incidents_Basic
- vw_LaborAssignments_Basic
- vw_DailyPerformance_Basic
- vw_Locations_Basic

Lưu ý: 
- Viewer chỉ nên được cấp quyền SELECT trên các View này.
- Không cấp quyền SELECT trực tiếp trên các bảng gốc (Prisoners, Visits, Incidents...).
';
GO