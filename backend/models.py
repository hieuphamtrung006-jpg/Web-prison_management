from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, Boolean, ForeignKey, Time
from sqlalchemy.orm import relationship
from database import Base
import datetime

# ----------------- NHÓM CORE -----------------

class User(Base):
    __tablename__ = "Users"
    UserID = Column(Integer, primary_key=True, autoincrement=True)
    Username = Column(String(50), unique=True, nullable=False)
    PasswordHash = Column(String(255), nullable=False)
    FullName = Column(String(100), nullable=False)
    Role = Column(String(20), nullable=False)
    Email = Column(String(100))
    Phone = Column(String(20))
    IsActive = Column(Boolean, default=True)
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

class Location(Base):
    __tablename__ = "Locations"
    LocationID = Column(Integer, primary_key=True, autoincrement=True)
    LocationName = Column(String(100), nullable=False)
    Type = Column(String(30))
    Capacity = Column(Integer, nullable=False)
    SecurityLevel = Column(String(20))
    IsActive = Column(Boolean, default=True)
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

class Prisoner(Base):
    __tablename__ = "Prisoners"
    PrisonerID = Column(Integer, primary_key=True, autoincrement=True)
    FullName = Column(String(100), nullable=False)
    DateOfBirth = Column(Date, nullable=False)
    Gender = Column(String(10))
    CrimeType = Column(String(100))
    RiskLevel = Column(String(20))
    ProductivityScore = Column(Numeric(5, 2), default=0)
    RehabHours = Column(Integer, default=0)
    CurrentLocationID = Column(Integer, ForeignKey("Locations.LocationID"), nullable=True)
    SentenceStart = Column(Date)
    SentenceEnd = Column(Date)
    Status = Column(String(20), default='InPrison')
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

# ----------------- NHÓM KINH TẾ & LAO ĐỘNG -----------------

class LaborProject(Base):
    __tablename__ = "LaborProjects"
    ProjectID = Column(Integer, primary_key=True, autoincrement=True)
    ProjectName = Column(String(100), nullable=False)
    RevenuePerHour = Column(Numeric(10, 2), nullable=False)
    PriorityScore = Column(Integer, default=0)
    MaxWorkers = Column(Integer, nullable=False)
    RequiredSkills = Column(String(200))
    IsActive = Column(Boolean, default=True)
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

class Shift(Base):
    __tablename__ = "Shifts"
    ShiftID = Column(Integer, primary_key=True, autoincrement=True)
    ShiftType = Column(String(30), nullable=False)
    StartTime = Column(Time, nullable=False)
    EndTime = Column(Time, nullable=False)
    Capacity = Column(Integer, nullable=False)
    IsForStaff = Column(Boolean, default=False)
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

class LaborAssignment(Base):
    __tablename__ = "LaborAssignments"
    AssignmentID = Column(Integer, primary_key=True, autoincrement=True)
    PrisonerID = Column(Integer, ForeignKey("Prisoners.PrisonerID"), nullable=False)
    ProjectID = Column(Integer, ForeignKey("LaborProjects.ProjectID"), nullable=False)
    AssignmentDate = Column(Date, nullable=False)
    HoursAssigned = Column(Numeric(5, 2), nullable=False)
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

class DailyPerformance(Base):
    __tablename__ = "DailyPerformance"
    PerformanceID = Column(Integer, primary_key=True, autoincrement=True)
    PrisonerID = Column(Integer, ForeignKey("Prisoners.PrisonerID"), nullable=False)
    ProjectID = Column(Integer, ForeignKey("LaborProjects.ProjectID"), nullable=False)
    WorkDate = Column(Date, nullable=False)
    Productivity = Column(Numeric(5, 2), nullable=False)
    Notes = Column(String(500))
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)

# ----------------- NHÓM LẬP LỊCH & AI -----------------

class Schedule(Base):
    __tablename__ = "Schedules"
    ScheduleID = Column(Integer, primary_key=True, autoincrement=True)
    PrisonerID = Column(Integer, ForeignKey("Prisoners.PrisonerID"), nullable=False)
    ProjectID = Column(Integer, ForeignKey("LaborProjects.ProjectID"), nullable=True)
    LocationID = Column(Integer, ForeignKey("Locations.LocationID"), nullable=True)
    ShiftID = Column(Integer, ForeignKey("Shifts.ShiftID"), nullable=False)
    StartTime = Column(DateTime, nullable=False)
    EndTime = Column(DateTime, nullable=False)
    AlgorithmTag = Column(String(20), nullable=False)
    Status = Column(String(20), default='Active')
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

class SchedulingConfig(Base):
    __tablename__ = "SchedulingConfigs"
    ConfigID = Column(Integer, primary_key=True, autoincrement=True)
    AlgorithmName = Column(String(20), nullable=False)
    WeightEconomy = Column(Numeric(5, 2), default=0.4)
    WeightSecurity = Column(Numeric(5, 2), default=0.3)
    WeightRehab = Column(Numeric(5, 2), default=0.3)
    LastRun = Column(DateTime, nullable=True)
    Parameters = Column(String) # Tương đương NVARCHAR(MAX)
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

# ----------------- NHÓM TƯƠNG TÁC & PHÁP LÝ -----------------

class Visit(Base):
    __tablename__ = "Visits"
    VisitID = Column(Integer, primary_key=True, autoincrement=True)
    PrisonerID = Column(Integer, ForeignKey("Prisoners.PrisonerID"), nullable=False)
    VisitorName = Column(String(100), nullable=False)
    VisitDate = Column(DateTime, nullable=False)
    Status = Column(String(20), default='Pending')
    ApprovedBy = Column(Integer, ForeignKey("Users.UserID"), nullable=True)
    Notes = Column(String(500))
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)
    UpdatedAt = Column(DateTime, nullable=True)

class Incident(Base):
    __tablename__ = "Incidents"
    IncidentID = Column(Integer, primary_key=True, autoincrement=True)
    PrisonerID = Column(Integer, ForeignKey("Prisoners.PrisonerID"), nullable=False)
    IncidentDate = Column(DateTime, nullable=False)
    IncidentType = Column(String(100))
    Severity = Column(String(20))
    PenaltyPoints = Column(Integer, default=0)
    Description = Column(String(500))
    CreatedBy = Column(Integer, ForeignKey("Users.UserID"), nullable=True)
    CreatedAt = Column(DateTime, default=datetime.datetime.utcnow)