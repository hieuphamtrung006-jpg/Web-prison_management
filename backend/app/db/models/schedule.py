from datetime import datetime, time
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Shift(Base):
    __tablename__ = "Shifts"

    shift_id: Mapped[int] = mapped_column("ShiftID", Integer, primary_key=True, index=True)
    shift_type: Mapped[str] = mapped_column("ShiftType", String(30), nullable=False)
    start_time: Mapped[time] = mapped_column("StartTime", Time, nullable=False)
    end_time: Mapped[time] = mapped_column("EndTime", Time, nullable=False)
    capacity: Mapped[int] = mapped_column("Capacity", Integer, nullable=False)
    is_for_staff: Mapped[bool] = mapped_column("IsForStaff", Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)


class Schedule(Base):
    __tablename__ = "Schedules"

    schedule_id: Mapped[int] = mapped_column("ScheduleID", Integer, primary_key=True, index=True)
    prisoner_id: Mapped[int] = mapped_column("PrisonerID", ForeignKey("Prisoners.PrisonerID"), nullable=False)
    project_id: Mapped[int | None] = mapped_column("ProjectID", ForeignKey("LaborProjects.ProjectID"), nullable=True)
    location_id: Mapped[int | None] = mapped_column("LocationID", ForeignKey("Locations.LocationID"), nullable=True)
    shift_id: Mapped[int] = mapped_column("ShiftID", ForeignKey("Shifts.ShiftID"), nullable=False)
    start_time: Mapped[datetime] = mapped_column("StartTime", DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column("EndTime", DateTime, nullable=False)
    status: Mapped[str] = mapped_column("Status", String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)


class SchedulingConfig(Base):
    __tablename__ = "SchedulingConfigs"

    config_id: Mapped[int] = mapped_column("ConfigID", Integer, primary_key=True, index=True)
    config_name: Mapped[str] = mapped_column("ConfigName", String(50), default="Mac dinh")
    weight_economy: Mapped[Decimal] = mapped_column("WeightEconomy", Numeric(5, 2), default=0.4)
    weight_security: Mapped[Decimal] = mapped_column("WeightSecurity", Numeric(5, 2), default=0.3)
    weight_rehab: Mapped[Decimal] = mapped_column("WeightRehab", Numeric(5, 2), default=0.3)
    last_run: Mapped[datetime | None] = mapped_column("LastRun", DateTime, nullable=True)
    parameters: Mapped[str | None] = mapped_column("Parameters", String, nullable=True)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)
