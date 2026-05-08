from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, condecimal


class LaborProjectSummary(BaseModel):
    project_id: int
    project_name: str
    max_workers: int
    current_workers: int
    open_slots: int


class LaborProjectRead(BaseModel):
    project_id: int
    project_name: str
    location_id: int | None = None
    revenue_per_hour: Decimal
    priority_score: int
    max_workers: int
    required_skills: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AssignmentCreate(BaseModel):
    prisoner_id: int = Field(..., gt=0)
    project_id: int = Field(..., gt=0)
    assignment_date: date
    hours_assigned: Decimal = condecimal(gt=0, max_digits=5, decimal_places=2)


class AssignmentRead(BaseModel):
    assignment_id: int
    prisoner_id: int
    project_id: int | None = None
    assigned_by: int | None = None
    assignment_date: date
    hours_assigned: Decimal
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PerformanceCreate(BaseModel):
    prisoner_id: int = Field(..., gt=0)
    project_id: int = Field(..., gt=0)
    work_date: date
    productivity: Decimal = condecimal(ge=0, le=100, max_digits=5, decimal_places=2)
    notes: str | None = Field(default=None, max_length=500)


class PerformanceRead(BaseModel):
    performance_id: int
    prisoner_id: int
    project_id: int
    evaluated_by: int | None = None
    work_date: date
    productivity: Decimal
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PrisonerPerformancePoint(BaseModel):
    work_date: date
    productivity: float
