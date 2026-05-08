from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator


class PrisonerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str | None = Field(default=None, max_length=10)
    crime_type: str | None = Field(default=None, max_length=100)
    risk_level: str | None = Field(default=None, max_length=20)
    rehab_hours: int = Field(default=0, ge=0)
    current_location_id: int | None = Field(default=None, gt=0)
    sentence_start: date | None = None
    sentence_end: date | None = None
    status: str = Field(default="InPrison", max_length=20)

    @model_validator(mode="after")
    def validate_sentence_dates(self) -> "PrisonerBase":
        if self.sentence_start and self.sentence_end and self.sentence_end < self.sentence_start:
            raise ValueError("Sentence end must be on or after sentence start")
        return self


class PrisonerCreate(PrisonerBase):
    pass


class PrisonerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=10)
    crime_type: str | None = Field(default=None, max_length=100)
    risk_level: str | None = Field(default=None, max_length=20)
    rehab_hours: int | None = Field(default=None, ge=0)
    current_location_id: int | None = Field(default=None, gt=0)
    sentence_start: date | None = None
    sentence_end: date | None = None
    status: str | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def validate_sentence_dates(self) -> "PrisonerUpdate":
        if self.sentence_start and self.sentence_end and self.sentence_end < self.sentence_start:
            raise ValueError("Sentence end must be on or after sentence start")
        return self


class PrisonerRead(PrisonerBase):
    prisoner_id: int
    productivity_score: Decimal

    model_config = {"from_attributes": True}


class PrisonerDetail(PrisonerRead):
    current_location_name: str | None = None
    projects: list[str] = []
