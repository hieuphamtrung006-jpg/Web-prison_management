from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Location(Base):
    __tablename__ = "Locations"

    location_id: Mapped[int] = mapped_column("LocationID", Integer, primary_key=True, index=True)
    location_name: Mapped[str] = mapped_column("LocationName", String(100), nullable=False)
    type: Mapped[str | None] = mapped_column("Type", String(30), nullable=True)
    capacity: Mapped[int] = mapped_column("Capacity", Integer, nullable=False)
    security_level: Mapped[str | None] = mapped_column("SecurityLevel", String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column("IsActive", Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)
