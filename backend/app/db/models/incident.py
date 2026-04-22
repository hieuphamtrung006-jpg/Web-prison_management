from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Incident(Base):
    __tablename__ = "Incidents"

    incident_id: Mapped[int] = mapped_column("IncidentID", Integer, primary_key=True, index=True)
    prisoner_id: Mapped[int] = mapped_column("PrisonerID", ForeignKey("Prisoners.PrisonerID"), nullable=False)
    location_id: Mapped[int | None] = mapped_column("LocationID", ForeignKey("Locations.LocationID"), nullable=True)
    incident_date: Mapped[datetime] = mapped_column("IncidentDate", DateTime, nullable=False)
    incident_type: Mapped[str | None] = mapped_column("IncidentType", String(100), nullable=True)
    severity: Mapped[str | None] = mapped_column("Severity", String(20), nullable=True)
    penalty_points: Mapped[int] = mapped_column("PenaltyPoints", Integer, default=0)
    description: Mapped[str | None] = mapped_column("Description", String(500), nullable=True)
    created_by: Mapped[int | None] = mapped_column("CreatedBy", ForeignKey("Users.UserID"), nullable=True)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
