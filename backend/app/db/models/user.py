from sqlalchemy import Boolean, Column, DateTime, Integer, String, Unicode
from sqlalchemy.sql import func

from app.db.base import Base


class User(Base):
    __tablename__ = "Users"

    user_id = Column("UserID", Integer, primary_key=True, index=True)
    username = Column("Username", String(50), unique=True, nullable=False)
    password_hash = Column("PasswordHash", String(255), nullable=False)
    full_name = Column("FullName", Unicode(100), nullable=False)
    role = Column("Role", String(20), nullable=False)
    email = Column("Email", String(100), nullable=True)
    phone = Column("Phone", String(20), nullable=True)
    is_active = Column("IsActive", Boolean, default=True, nullable=False)

    created_at = Column("CreatedAt", DateTime, default=func.now(), nullable=False)
    updated_at = Column("UpdatedAt", DateTime, default=func.now(), onupdate=func.now(), nullable=True)

    def __repr__(self):
        return f"<User(id={self.user_id}, username={self.username}, role={self.role})>"
