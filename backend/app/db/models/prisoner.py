from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Prisoner(Base):
    __tablename__ = "Prisoners"

    # === Thêm dòng này ===
    __table_args__ = {"implicit_returning": False}

    # Disable implicit returning (OUTPUT clause) because this table has AFTER triggers (for AuditLog).
    # SQL Server does not allow OUTPUT on tables with enabled triggers.
    # This forces SQLAlchemy to do a separate SELECT after INSERT/UPDATE instead of using OUTPUT.

    prisoner_id: Mapped[int] = mapped_column("PrisonerID", Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column("FullName", String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column("DateOfBirth", Date, nullable=False)
    gender: Mapped[str | None] = mapped_column("Gender", String(10), nullable=True)
    crime_type: Mapped[str | None] = mapped_column("CrimeType", String(100), nullable=True)
    risk_level: Mapped[str | None] = mapped_column("RiskLevel", String(20), nullable=True)
    productivity_score: Mapped[Decimal] = mapped_column("ProductivityScore", Numeric(5, 2), default=0)
    rehab_hours: Mapped[int] = mapped_column("RehabHours", Integer, default=0)
    current_location_id: Mapped[int | None] = mapped_column(
        "CurrentLocationID", ForeignKey("Locations.LocationID"), nullable=True
    )
    sentence_start: Mapped[date | None] = mapped_column("SentenceStart", Date, nullable=True)
    sentence_end: Mapped[date | None] = mapped_column("SentenceEnd", Date, nullable=True)
    status: Mapped[str] = mapped_column("Status", String(20), default="InPrison")
    created_at: Mapped[datetime] = mapped_column(
        "CreatedAt",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        "UpdatedAt",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
