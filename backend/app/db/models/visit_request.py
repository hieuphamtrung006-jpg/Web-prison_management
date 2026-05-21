from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VisitRequest(Base):
    __tablename__ = "VisitRequests"

    request_id: Mapped[int] = mapped_column("RequestID", Integer, primary_key=True, index=True)
    prisoner_id: Mapped[int] = mapped_column("PrisonerID", ForeignKey("Prisoners.PrisonerID"), nullable=False)
    viewer_id: Mapped[int] = mapped_column("ViewerID", ForeignKey("Users.UserID"), nullable=False)
    requested_date: Mapped[datetime] = mapped_column("RequestedDate", DateTime, nullable=False)
    status: Mapped[str] = mapped_column("Status", String(20), default="Pending")
