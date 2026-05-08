from datetime import datetime, time

from pydantic import BaseModel


class ShiftRead(BaseModel):
    shift_id: int
    shift_type: str
    start_time: time
    end_time: time
    capacity: int
    is_for_staff: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
