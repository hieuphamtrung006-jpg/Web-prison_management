from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Visit(Base):
    __tablename__ = "Visits"

    visit_id: Mapped[int] = mapped_column("VisitID", Integer, primary_key=True, index=True)
    prisoner_id: Mapped[int] = mapped_column("PrisonerID", ForeignKey("Prisoners.PrisonerID"), nullable=False)
    visitor_name: Mapped[str] = mapped_column("VisitorName", String(100), nullable=False)
    visit_date: Mapped[datetime] = mapped_column("VisitDate", DateTime, nullable=False)
    status: Mapped[str] = mapped_column("Status", String(20), default="Pending")
    approved_by: Mapped[int | None] = mapped_column("ApprovedBy", ForeignKey("Users.UserID"), nullable=True)
    notes: Mapped[str | None] = mapped_column("Notes", String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column("CreatedAt", DateTime)
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)
