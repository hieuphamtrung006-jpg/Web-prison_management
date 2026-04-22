from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "Users"

    user_id: Mapped[int] = mapped_column("UserID", Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column("Username", String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column("PasswordHash", String(255), nullable=False)
    full_name: Mapped[str] = mapped_column("FullName", String(100), nullable=False)
    role: Mapped[str] = mapped_column("Role", String(20), nullable=False)
    email: Mapped[str | None] = mapped_column("Email", String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column("Phone", String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column("IsActive", Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)
