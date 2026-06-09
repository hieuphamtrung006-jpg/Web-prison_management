from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, condecimal


class LaborProjectBase(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=100)
    location_id: int | None = Field(default=None, gt=0)
    revenue_per_hour: Decimal = condecimal(gt=0, max_digits=10, decimal_places=2)
    priority_score: int = Field(default=0, ge=0)
    max_workers: int = Field(..., gt=0)
    required_skills: str | None = Field(default=None, max_length=200)
    is_active: bool = True


class LaborProjectCreate(LaborProjectBase):
    pass


class LaborProjectUpdate(BaseModel):
    project_name: str | None = Field(default=None, min_length=1, max_length=100)
    location_id: int | None = Field(default=None, gt=0)
    revenue_per_hour: Decimal | None = Field(default=None)
    priority_score: int | None = Field(default=None, ge=0)
    max_workers: int | None = Field(default=None, gt=0)
    required_skills: str | None = Field(default=None, max_length=200)
    is_active: bool | None = None


class LaborProjectRead(BaseModel):
    project_id: int
    project_name: str
    location_id: int | None = None
    location_name: str | None = None
    revenue_per_hour: Decimal
    priority_score: int
    max_workers: int
    current_workers: int = 0
    open_slots: int = 0
    required_skills: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class LaborProjectSummary(BaseModel):
    project_id: int
    project_name: str
    max_workers: int
    current_workers: int
    open_slots: int


class LaborAssignmentBase(BaseModel):
    prisoner_id: int = Field(..., gt=0)
    project_id: int = Field(..., gt=0)
    assignment_date: date
    hours_assigned: Decimal = condecimal(gt=0, max_digits=5, decimal_places=2)


class LaborAssignmentCreate(LaborAssignmentBase):
    pass


class LaborAssignmentUpdate(BaseModel):
    prisoner_id: int | None = Field(default=None, gt=0)
    project_id: int | None = Field(default=None, gt=0)
    assignment_date: date | None = None
    hours_assigned: Decimal | None = Field(default=None)


class LaborAssignmentRead(BaseModel):
    assignment_id: int
    prisoner_id: int
    prisoner_name: str | None = None
    project_id: int | None = None
    project_name: str | None = None
    assigned_by: int | None = None
    assigned_by_name: str | None = None
    assignment_date: date
    hours_assigned: Decimal
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class DailyPerformanceCreate(BaseModel):
    prisoner_id: int = Field(..., gt=0)
    project_id: int = Field(..., gt=0)
    work_date: date
    productivity: Decimal = condecimal(ge=0, le=100, max_digits=5, decimal_places=2)
    notes: str | None = Field(default=None, max_length=500)


class DailyPerformanceRead(BaseModel):
    performance_id: int
    prisoner_id: int
    prisoner_name: str | None = None
    project_id: int
    project_name: str | None = None
    evaluated_by: int | None = None
    evaluated_by_name: str | None = None
    work_date: date
    productivity: Decimal
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PrisonerPerformancePoint(BaseModel):
    work_date: date
    productivity: float


AssignmentCreate = LaborAssignmentCreate
AssignmentRead = LaborAssignmentRead
PerformanceCreate = DailyPerformanceCreate
PerformanceRead = DailyPerformanceRead


# --- Basic schemas for Viewer role ---
class LaborAssignmentReadBasic(BaseModel):
    assignment_id: int
    prisoner_id: int
    project_id: int
    assignment_date: date
    hours_assigned: Decimal

    model_config = {"from_attributes": True}


class DailyPerformanceReadBasic(BaseModel):
    performance_id: int
    prisoner_id: int
    project_id: int
    work_date: date
    productivity: Decimal
    notes: str | None = None

    model_config = {"from_attributes": True}

