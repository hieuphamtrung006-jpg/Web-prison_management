from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


SeverityLevel = Literal["Low", "Medium", "High"]


class IncidentCreate(BaseModel):
    prisoner_id: int = Field(..., gt=0)
    location_id: int | None = Field(default=None, gt=0)
    incident_date: datetime
    incident_type: str | None = Field(default=None, max_length=100)
    severity: SeverityLevel | None = None
    penalty_points: int = Field(default=0, ge=0)
    description: str | None = Field(default=None, max_length=500)


class IncidentUpdate(BaseModel):
    prisoner_id: int | None = Field(default=None, gt=0)
    location_id: int | None = Field(default=None, gt=0)
    incident_date: datetime | None = None
    incident_type: str | None = Field(default=None, max_length=100)
    severity: SeverityLevel | None = None
    penalty_points: int | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, max_length=500)


class IncidentRead(BaseModel):
    incident_id: int
    prisoner_id: int
    location_id: int | None = None
    incident_date: datetime
    incident_type: str | None = None
    severity: SeverityLevel | None = None
    penalty_points: int
    description: str | None = None
    created_by: int | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# --- Basic schema for Viewer role (maps to vw_Incidents_Basic) ---
class IncidentReadBasic(BaseModel):
    incident_id: int
    prisoner_id: int
    incident_date: datetime
    incident_type: str | None = None
    severity: SeverityLevel | None = None
    penalty_points: int

    model_config = {"from_attributes": True}
