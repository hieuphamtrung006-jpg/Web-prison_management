from datetime import datetime

from pydantic import BaseModel, Field


class VisitCreate(BaseModel):
    prisoner_id: int = Field(..., gt=0)
    visitor_name: str = Field(..., min_length=1, max_length=100)
    visit_date: datetime
    notes: str | None = Field(default=None, max_length=500)


class VisitRead(BaseModel):
    visit_id: int
    prisoner_id: int
    visitor_name: str
    visit_date: datetime
    status: str
    approved_by: int | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class VisitUpdate(BaseModel):
    prisoner_id: int | None = Field(default=None, gt=0)
    visitor_name: str | None = Field(default=None, min_length=1, max_length=100)
    visit_date: datetime | None = None
    status: str | None = Field(default=None, min_length=1, max_length=20)
    notes: str | None = Field(default=None, max_length=500)


class VisitRequestCreate(BaseModel):
    prisoner_id: int = Field(..., gt=0)
    requested_date: datetime


class VisitRequestRead(BaseModel):
    request_id: int
    prisoner_id: int
    viewer_id: int
    requested_date: datetime
    status: str

    model_config = {"from_attributes": True}
