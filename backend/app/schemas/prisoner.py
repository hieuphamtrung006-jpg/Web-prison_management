from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class PrisonerBase(BaseModel):
    full_name: str
    date_of_birth: date
    gender: str | None = None
    crime_type: str | None = None
    risk_level: str | None = None
    rehab_hours: int = 0
    current_location_id: int | None = None
    sentence_start: date | None = None
    sentence_end: date | None = None
    status: str = "InPrison"


class PrisonerCreate(PrisonerBase):
    pass


class PrisonerUpdate(BaseModel):
    full_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    crime_type: str | None = None
    risk_level: str | None = None
    rehab_hours: int | None = None
    current_location_id: int | None = None
    sentence_start: date | None = None
    sentence_end: date | None = None
    status: str | None = None


class PrisonerRead(PrisonerBase):
    prisoner_id: int
    productivity_score: Decimal

    model_config = {"from_attributes": True}


class PrisonerDetail(PrisonerRead):
    current_location_name: str | None = None
    projects: list[str] = []
