from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LaborProject(Base):
    __tablename__ = "LaborProjects"

    project_id: Mapped[int] = mapped_column("ProjectID", Integer, primary_key=True, index=True)
    project_name: Mapped[str] = mapped_column("ProjectName", String(100), nullable=False)
    location_id: Mapped[int | None] = mapped_column("LocationID", ForeignKey("Locations.LocationID"), nullable=True)
    revenue_per_hour: Mapped[Decimal] = mapped_column("RevenuePerHour", Numeric(10, 2), nullable=False)
    priority_score: Mapped[int] = mapped_column("PriorityScore", Integer, default=0)
    max_workers: Mapped[int] = mapped_column("MaxWorkers", Integer, nullable=False)
    required_skills: Mapped[str | None] = mapped_column("RequiredSkills", String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column("IsActive", Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)


class LaborAssignment(Base):
    __tablename__ = "LaborAssignments"

    assignment_id: Mapped[int] = mapped_column("AssignmentID", Integer, primary_key=True, index=True)
    prisoner_id: Mapped[int] = mapped_column("PrisonerID", ForeignKey("Prisoners.PrisonerID"), nullable=False)
    project_id: Mapped[int | None] = mapped_column("ProjectID", ForeignKey("LaborProjects.ProjectID"), nullable=True)
    assigned_by: Mapped[int | None] = mapped_column("AssignedBy", ForeignKey("Users.UserID"), nullable=True)
    assignment_date: Mapped[date] = mapped_column("AssignmentDate", Date, nullable=False)
    hours_assigned: Mapped[Decimal] = mapped_column("HoursAssigned", Numeric(5, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)


class DailyPerformance(Base):
    __tablename__ = "DailyPerformance"

    performance_id: Mapped[int] = mapped_column("PerformanceID", Integer, primary_key=True, index=True)
    prisoner_id: Mapped[int] = mapped_column("PrisonerID", ForeignKey("Prisoners.PrisonerID"), nullable=False)
    project_id: Mapped[int] = mapped_column("ProjectID", ForeignKey("LaborProjects.ProjectID"), nullable=False)
    evaluated_by: Mapped[int | None] = mapped_column("EvaluatedBy", ForeignKey("Users.UserID"), nullable=True)
    work_date: Mapped[date] = mapped_column("WorkDate", Date, nullable=False)
    productivity: Mapped[Decimal] = mapped_column("Productivity", Numeric(5, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column("Notes", String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
