from typing import Literal

from pydantic import BaseModel

RoleName = Literal["Admin", "Warden", "Guard", "Viewer"]


class UserBase(BaseModel):
    username: str
    full_name: str
    role: RoleName
    email: str | None = None
    phone: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: RoleName | None = None
    email: str | None = None
    phone: str | None = None
    is_active: bool | None = None
    password: str | None = None


class UserRead(UserBase):
    user_id: int
    is_active: bool

    model_config = {"from_attributes": True}
