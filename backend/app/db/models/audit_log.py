"""
SQLAlchemy model for the AuditLog table.

This model is provided so the application can query audit history if needed
(e.g. for admin dashboards showing "who changed what and when").

Note:
    - The actual INSERTs into this table are performed by database triggers.
    - The application should almost never INSERT directly into AuditLog.
    - Use this model primarily for SELECT / reporting purposes.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "AuditLog"

    audit_id: Mapped[int] = mapped_column("AuditID", Integer, primary_key=True, index=True)

    table_name: Mapped[str] = mapped_column("TableName", String(100), nullable=False, index=True)
    record_id: Mapped[int] = mapped_column("RecordID", Integer, nullable=False, index=True)

    # Action: 'INSERT' | 'UPDATE' | 'DELETE'
    action: Mapped[str] = mapped_column("Action", String(10), nullable=False, index=True)

    # Stored as JSON string (produced by the trigger using FOR JSON)
    old_value: Mapped[str | None] = mapped_column("OldValue", String, nullable=True)
    new_value: Mapped[str | None] = mapped_column("NewValue", String, nullable=True)

    # References Users.UserID (the person who performed the action)
    changed_by: Mapped[int | None] = mapped_column(
        "ChangedBy", Integer, ForeignKey("Users.UserID"), nullable=True, index=True
    )

    changed_at: Mapped[datetime] = mapped_column(
        "ChangedAt",
        DateTime(timezone=True),
        nullable=False,
    )

    ip_address: Mapped[str | None] = mapped_column("IPAddress", String(50), nullable=True)
