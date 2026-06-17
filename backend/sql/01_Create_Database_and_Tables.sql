-- ============================================================
-- File: 01_Create_Database_and_Tables.sql
-- Mục đích: Tạo Database mới + Toàn bộ bảng + Foreign Key + Index cơ bản
-- ============================================================

-- Xóa database cũ nếu tồn tại (để reset sạch)
IF DB_ID('PRISON') IS NOT NULL
BEGIN
    ALTER DATABASE PRISON SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE PRISON;
END
GO

CREATE DATABASE PRISON;
GO

USE PRISON;
GO

PRINT '=== Bắt đầu tạo cấu trúc database ===';
GO

-- ============================================================
-- BẢNG USERS
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

-- ============================================================
-- BẢNG LOCATIONS
-- ============================================================
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

-- ============================================================
-- BẢNG PRISONERS
-- ============================================================
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

-- ============================================================
-- BẢNG LABORPROJECTS
-- ============================================================
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

-- ============================================================
-- CÁC BẢNG KHÁC
-- ============================================================
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
    ApprovedBy      INT