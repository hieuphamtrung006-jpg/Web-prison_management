from typing import Literal

from pydantic import BaseModel, Field

RoleName = Literal["Admin", "Warden", "Guard", "Viewer"]


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: RoleName
    email: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    role: RoleName | None = None
    email: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)


class UserRead(UserBase):
    user_id: int
    is_active: bool

    model_config = {"from_attributes": True}
