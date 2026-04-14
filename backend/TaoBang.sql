/*-- CORE ENTITIES
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
    FOREIGN KEY (CurrentLocationID) REFERENCES Locations(LocationID)
);

-- KINH TẾ & LAO ĐỘNG
CREATE TABLE LaborProjects (
    ProjectID       INT IDENTITY(1,1) PRIMARY KEY,
    ProjectName     NVARCHAR(100) NOT NULL,
    RevenuePerHour  DECIMAL(10,2) NOT NULL,
    PriorityScore   INT DEFAULT 0,
    MaxWorkers      INT NOT NULL,
    RequiredSkills  NVARCHAR(200),
    IsActive        BIT DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL
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

CREATE TABLE LaborAssignments (
    AssignmentID    INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    ProjectID       INT NOT NULL,
    AssignmentDate  DATE NOT NULL,
    HoursAssigned   DECIMAL(5,2) NOT NULL,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL,
    FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    FOREIGN KEY (ProjectID) REFERENCES LaborProjects(ProjectID)
);

CREATE TABLE DailyPerformance (
    PerformanceID   INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    ProjectID       INT NOT NULL,
    WorkDate        DATE NOT NULL,
    Productivity    DECIMAL(5,2) NOT NULL,
    Notes           NVARCHAR(500),
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    FOREIGN KEY (ProjectID) REFERENCES LaborProjects(ProjectID)
);

-- LẬP LỊCH & AI
CREATE TABLE Schedules (
    ScheduleID      INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    ProjectID       INT NULL,
    LocationID      INT NULL,
    ShiftID         INT NOT NULL,
    StartTime       DATETIME2 NOT NULL,
    EndTime         DATETIME2 NOT NULL,
    AlgorithmTag    NVARCHAR(20) NOT NULL CHECK (AlgorithmTag IN ('Greedy', 'Genetic', 'OR-Tools')),
    Status          NVARCHAR(20) DEFAULT 'Active',
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL,
    FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    FOREIGN KEY (ProjectID) REFERENCES LaborProjects(ProjectID),
    FOREIGN KEY (LocationID) REFERENCES Locations(LocationID),
    FOREIGN KEY (ShiftID) REFERENCES Shifts(ShiftID)
);

CREATE TABLE SchedulingConfigs (
    ConfigID        INT IDENTITY(1,1) PRIMARY KEY,
    AlgorithmName   NVARCHAR(20) NOT NULL,
    WeightEconomy   DECIMAL(5,2) DEFAULT 0.4,
    WeightSecurity  DECIMAL(5,2) DEFAULT 0.3,
    WeightRehab     DECIMAL(5,2) DEFAULT 0.3,
    LastRun         DATETIME2 NULL,
    Parameters      NVARCHAR(MAX),
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    UpdatedAt       DATETIME2 NULL
);

-- TƯƠNG TÁC & PHÁP LÝ
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
    FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    FOREIGN KEY (ApprovedBy) REFERENCES Users(UserID)
);

CREATE TABLE Incidents (
    IncidentID      INT IDENTITY(1,1) PRIMARY KEY,
    PrisonerID      INT NOT NULL,
    IncidentDate    DATETIME2 NOT NULL,
    IncidentType    NVARCHAR(100),
    Severity        NVARCHAR(20) CHECK (Severity IN ('Low', 'Medium', 'High')),
    PenaltyPoints   INT DEFAULT 0,
    Description     NVARCHAR(500),
    CreatedBy       INT NULL,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PrisonerID) REFERENCES Prisoners(PrisonerID),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)
);

PRINT '✅ Tạo xong 11 bảng thành công!';
 */