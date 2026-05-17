from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.user import RoleName


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class SignUpRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: RoleName = "Viewer"
    email: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class SignUpResponse(TokenResponse):
    user_id: int
    username: str
    full_name: str
    role: RoleName


class UserProfile(BaseModel):
    user_id: int
    username: str
    full_name: str
    role: RoleName
    is_active: bool

    model_config = {"from_attributes": True}
