"""
Audit Context Module

This module provides utilities to pass the current authenticated user information
(UserID and IP Address) to SQL Server via SESSION_CONTEXT.

This allows database triggers (on Prisoners, LaborAssignments, Visits, Incidents)
to automatically record who performed INSERT/UPDATE/DELETE operations
without the application needing to manually insert into AuditLog.

Usage:
    from app.core.audit import get_audit_context

    @router.post("/")
    def create_something(
        payload: ...,
        current_user: User = Depends(get_audit_context),  # This will set the context
        db: Session = Depends(get_db),
    ):
        ...
"""

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models.user import User


def set_audit_context(db: Session, user_id: int, ip_address: str | None = None) -> None:
    """
    Sends the current UserID and optional IP Address to SQL Server session context.

    The database triggers read these values using:
        CAST(SESSION_CONTEXT(N'UserID') AS INT)
        CAST(SESSION_CONTEXT(N'IPAddress') AS NVARCHAR(50))

    This must be called **before** performing any INSERT, UPDATE, or DELETE
    on tables that have audit triggers.

    Note:
        - We use the raw pyodbc connection because sp_set_session_context
          must be executed on the actual database connection.
        - No commit is needed for session context.
    """
    try:
        # Get the underlying pyodbc connection from SQLAlchemy session
        raw_conn = db.connection().connection
        cursor = raw_conn.cursor()

        # Set UserID (always required for audit)
        cursor.execute(
            "EXEC sp_set_session_context @key = N'UserID', @value = ?",
            user_id,
        )

        # Set IP Address if provided (optional but useful for security audit)
        if ip_address:
            cursor.execute(
                "EXEC sp_set_session_context @key = N'IPAddress', @value = ?",
                ip_address,
            )
    except Exception:
        # Fail silently for audit context - we don't want to break business operations
        # if setting context fails for any reason (e.g. connection issues).
        # The trigger will simply record ChangedBy = NULL in that case.
        pass


def get_audit_context(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI Dependency that:
    1. Resolves the current authenticated user (via get_current_user).
    2. Extracts the client IP address (with proxy support).
    3. Calls set_audit_context() to make UserID + IP available to SQL Server triggers.
    4. Returns the User object for use in the endpoint.

    This dependency should be used instead of get_current_user on any endpoint
    that performs data modification (INSERT/UPDATE/DELETE) on audited tables.

    IP Resolution priority:
    - X-Forwarded-For header (common when behind Nginx, Cloudflare, load balancer)
    - request.client.host (direct connection)
    - None (if unavailable)
    """
    # Extract client IP with support for reverse proxies
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2...
        # The first one is usually the original client.
        client_ip = forwarded_for.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = None

    # Set the audit context on the current database session/connection
    set_audit_context(db, current_user.user_id, client_ip)

    return current_user
