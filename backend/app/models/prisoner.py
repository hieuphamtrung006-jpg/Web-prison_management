from pydantic import BaseModel, Field


class Prisoner(BaseModel):
    id: str | None = None
    full_name: str = Field(min_length=2, max_length=120)
    block: str = Field(min_length=1, max_length=20)
    risk_level: str = Field(default="medium")

