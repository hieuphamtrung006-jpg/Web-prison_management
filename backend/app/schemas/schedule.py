from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class ScheduleConfigRead(BaseModel):
    config_id: int
    config_name: str
    weight_economy: float
    weight_security: float
    weight_rehab: float
    last_run: datetime | None = None
    parameters: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ScheduleConfigUpdate(BaseModel):
    config_name: str | None = Field(default=None, max_length=50)
    weight_economy: float | None = Field(default=None, ge=0, le=1)
    weight_security: float | None = Field(default=None, ge=0, le=1)
    weight_rehab: float | None = Field(default=None, ge=0, le=1)
    parameters: str | None = None


class ScheduleGenerateRequest(BaseModel):
    config_id: int = Field(..., gt=0)
    target_date: date | None = None


class ScheduleGenerateResponse(BaseModel):
    detail: str
    count: int
    target_date: str
    ai_meta: dict[str, object] = Field(default_factory=dict)


class ScheduleDailyEntry(BaseModel):
    schedule_id: int
    start_time: datetime
    end_time: datetime
    prisoner_id: int
    full_name: str
    project_name: str | None = None
    location_name: str | None = None


class ScheduleRead(BaseModel):
    schedule_id: int
    prisoner_id: int
    project_id: int | None = None
    location_id: int | None = None
    shift_id: int
    start_time: datetime
    end_time: datetime
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ScheduleUpdate(BaseModel):
    prisoner_id: int | None = Field(default=None, gt=0)
    project_id: int | None = Field(default=None, gt=0)
    location_id: int | None = Field(default=None, gt=0)
    shift_id: int | None = Field(default=None, gt=0)
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str | None = Field(default=None, max_length=20)


class ScheduleDailyResponse(BaseModel):
    target_date: str
    group_by: Literal["location", "project"]
    groups: dict[str, list[ScheduleDailyEntry]]
