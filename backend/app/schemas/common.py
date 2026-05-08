from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    detail: str = Field(..., min_length=1, max_length=200)
