from datetime import datetime

from pydantic import BaseModel, Field


class LocationBase(BaseModel):
    location_name: str = Field(..., min_length=1, max_length=100)
    type: str | None = Field(default=None, max_length=30)
    capacity: int = Field(..., ge=1)
    security_level: str | None = Field(default=None, max_length=20)
    is_active: bool = True


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    location_name: str | None = Field(default=None, min_length=1, max_length=100)
    type: str | None = Field(default=None, max_length=30)
    capacity: int | None = Field(default=None, ge=1)
    security_level: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class LocationRead(LocationBase):
    location_id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class LocationOccupancyRead(BaseModel):
    location_id: int
    location_name: str
    type: str | None = None
    capacity: int
    security_level: str | None = None
    is_active: bool
    current_occupancy: int
    assigned_occupancy: int
