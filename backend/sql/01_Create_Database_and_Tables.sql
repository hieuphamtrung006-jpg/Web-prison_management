-- ============================================================
-- File: 01_Create_Database_and_Tables.sql
-- Mục đích: Tạo Database + Toàn bộ bảng + Sửa lỗi tiếng Việt
-- ============================================================

-- Xóa database cũ nếu tồn tại
IF DB_ID('PRISON') IS NOT NULL
BEGIN
    ALTER DATABASE PRISON SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE PRISON;
END
GO

-- Tạo database mới
CREATE DATABASE PRISON;
GO

USE PRISON;
GO

PRINT '=== Bắt đầu tạo cấu trúc database ===';
GO

-- ============================================================
-- TẠO BẢNG
-- ============================================================

CREATE TABLE Users (
    UserID          INT IDENTITY(1,1) PRIMARY KEY,
    Username        NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash    NVARCHAR(255) NOT NULL,
    FullName        NVARCHAR(100) NOT NULL,
    Role            NVARCHAR(20) NOT NULL CHECK (Role IN ('Admin', 'Warden', 'Guard', 'Viewer')),
    Email           NVARCHAR(100),
    Phone           NVARCHAR(20),
    IsActive        BIT DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL
);

CREATE TABLE Locations (
    LocationID      INT IDENTITY(1,1) PRIMARY KEY,
    LocationName    NVARCHAR(100) NOT NULL,
    Type            NVARCHAR(30) CHECK (Type IN ('Cell', 'Workshop', 'Dining', 'Yard', 'Hospital')),
    Capacity        INT NOT NULL,
    SecurityLevel   NVARCHAR(20),
    IsActive        BIT DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL
);

CREATE TABLE Prisoners (
    PrisonerID          INT IDENTITY(1,1) PRIMARY KEY,
    FullName            NVARCHAR(100) NOT NULL,
    DateOfBirth         DATE NOT NULL,
    Gender              NVARCHAR(10) CHECK (Gender IN ('Male', 'Female', 'Other')),
    CrimeType           NVARCHAR(100),
    RiskLevel           NVARCHAR(20) CHECK (RiskLevel IN ('Low', 'Medium', 'High')),
    ProductivityScore   DECIMAL(5,2) DEFAULT 0,
    RehabHours          INT DEFAULT 0,
    CurrentLocationID   INT NULL,
    SentenceStart       DATE,
    SentenceEnd         DATE,
    Status              NVARCHAR(20) DEFAULT 'InPrison',
    CreatedAt           DATETIME2 DEFAULT GETDATE(),
    UpdatedAt           DATETIME2 NULL,
    CONSTRAINT FK_Prisoners_Locations FOREIGN KEY (CurrentLocationID) REFERENCES Locations(LocationID)
);

CREATE TABLE LaborProjects (
    ProjectID       INT IDENTITY(1,1) PRIMARY KEY,
    ProjectName     NVARCHAR(100) NOT NULL,
    LocationID      INT NULL,
    RevenuePerHour  DECIMAL(10,2) NOT NULL,
    PriorityScore   INT DEFAULT 0,
    MaxWorkers      INT NOT NULL,
    RequiredSkills  NVARCHAR(200),
    IsActive        BIT DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL,
    CONSTRAINT FK_LaborProjects_Locations FOREIGN KEY (LocationID) REFERENCES Locations(LocationID)
);

CREATE TABLE Shifts (
    ShiftID         INT IDENTITY(1,1) PRIMARY KEY,
    ShiftType       NVARCHAR(30) NOT NULL,
    StartTime       TIME NOT NULL,
    EndTime         TIME NOT NULL,
    Capacity        INT NOT NULL,
    IsForStaff      BIT DEFAULT 0,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL
);

CREATE TABLE DailyPerformance (
    PerformanceID   INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    ProjectID       INT NOT NULL,
    EvaluatedBy     INT NULL,
    WorkDate        DATE NOT NULL,
    Productivity    DECIMAL(5,2) NOT NULL,
    Notes           NVARCHAR(500),
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Performance_Prisoners FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    CONSTRAINT FK_Performance_Projects FOREIGN KEY (ProjectID) REFERENCES LaborProjects(ProjectID),
    CONSTRAINT FK_Performance_Users FOREIGN KEY (EvaluatedBy) REFERENCES Users(UserID)
);

CREATE TABLE Schedules (
    ScheduleID      INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    ProjectID       INT NULL,
    LocationID      INT NULL,
    ShiftID         INT NOT NULL,
    StartTime       DATETIME2 NOT NULL,
    EndTime         DATETIME2 NOT NULL,
    Status          NVARCHAR(20) DEFAULT 'Active',
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL,
    CONSTRAINT FK_Schedules_Prisoners FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    CONSTRAINT FK_Schedules_Projects FOREIGN KEY (ProjectID) REFERENCES LaborProjects(ProjectID),
    CONSTRAINT FK_Schedules_Locations FOREIGN KEY (LocationID) REFERENCES Locations(LocationID),
    CONSTRAINT FK_Schedules_Shifts FOREIGN KEY (ShiftID) REFERENCES Shifts(ShiftID)
);

CREATE TABLE SchedulingConfigs (
    ConfigID        INT IDENTITY(1,1) PRIMARY KEY,
    ConfigName      NVARCHAR(50) DEFAULT N'Mặc định',
    WeightEconomy   DECIMAL(5,2) DEFAULT 0.4,
    WeightSecurity  DECIMAL(5,2) DEFAULT 0.3,
    WeightRehab     DECIMAL(5,2) DEFAULT 0.3,
    LastRun         DATETIME2 NULL,
    Parameters      NVARCHAR(MAX),
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL
);

CREATE TABLE Visits (
    VisitID         INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    VisitorName     NVARCHAR(100) NOT NULL,
    VisitDate       DATETIME2 NOT NULL,
    Status          NVARCHAR(20) DEFAULT 'Pending',
    ApprovedBy      INT NULL,
    Notes           NVARCHAR(500),
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL,
    CONSTRAINT FK_Visits_Prisoners FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    CONSTRAINT FK_Visits_Users FOREIGN KEY (ApprovedBy) REFERENCES Users(UserID)
);

CREATE TABLE Incidents (
    IncidentID      INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    LocationID      INT NULL,
    IncidentDate    DATETIME2 NOT NULL,
    IncidentType    NVARCHAR(100),
    Severity        NVARCHAR(20) CHECK (Severity IN ('Low', 'Medium', 'High')),
    PenaltyPoints   INT DEFAULT 0,
    Description     NVARCHAR(500),
    CreatedBy       INT NULL,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Incidents_Prisoners FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    CONSTRAINT FK_Incidents_Locations FOREIGN KEY (LocationID) REFERENCES Locations(LocationID),
    CONSTRAINT FK_Incidents_Users FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)
);

CREATE TABLE VisitRequests (
    RequestID       INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    ViewerID        INT NOT NULL,
    RequestedDate   DATETIME2(0) NOT NULL,
    Status          NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    CreatedAt       DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2(0) NULL,
    CONSTRAINT PK_VisitRequests PRIMARY KEY CLUSTERED (RequestID),
    CONSTRAINT FK_VisitRequests_Prisoners FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    CONSTRAINT FK_VisitRequests_Users FOREIGN KEY (ViewerID) REFERENCES Users(UserID),
    CONSTRAINT CHK_VisitRequests_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected'))
);

-- Index cho VisitRequests
CREATE NONCLUSTERED INDEX IX_VisitRequests_PrisonerID ON VisitRequests(PrisonerID);
CREATE NONCLUSTERED INDEX IX_VisitRequests_ViewerID ON VisitRequests(ViewerID);
CREATE NONCLUSTERED INDEX IX_VisitRequests_Status ON VisitRequests(Status);

PRINT '=== Đã tạo xong các bảng ===';
GO

-- ============================================================
-- SỬA LỖI TIẾNG VIỆT (Chuyển sang NVARCHAR)
-- ============================================================
ALTER TABLE Visits ALTER COLUMN VisitorName NVARCHAR(100) NOT NULL;
ALTER TABLE Visits ALTER COLUMN Notes NVARCHAR(500) NULL;
ALTER TABLE Visits ALTER COLUMN Status NVARCHAR(20) NOT NULL;

ALTER TABLE Incidents ALTER COLUMN IncidentType NVARCHAR(100) NULL;
ALTER TABLE Incidents ALTER COLUMN Description NVARCHAR(500) NULL;
ALTER TABLE Incidents ALTER COLUMN Severity NVARCHAR(20) NULL;

PRINT '=== Đã sửa lỗi tiếng Việt ===';
GO

PRINT '=== File 01 hoàn tất ===';
GO