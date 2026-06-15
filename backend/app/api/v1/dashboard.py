from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.user import User
from app.db.models.visit_request import VisitRequest

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Real-time dashboard key indicators using direct COUNT queries.
    Always returns accurate aggregates (bypasses pagination, list limits, and viewer Basic schemas).

    - activeStaff: Active users (IsActive = 1)
    - inCustody: Prisoners currently in prison (Status = 'InPrison')
    - facilities: Active locations/facilities (IsActive = 1)
    - pendingVisits: Pending visit requests (Status = 'Pending' on VisitRequests, not Visits)
    """
    active_staff = (
        db.query(User)
        .filter(User.is_active == True)  # IsActive column
        .count()
    )

    in_custody = (
        db.query(Prisoner)
        .filter(Prisoner.status == "InPrison")
        .count()
    )

    facilities = (
        db.query(Location)
        .filter(Location.is_active == True)  # IsActive column
        .count()
    )

    pending_visits = (
        db.query(VisitRequest)
        .filter(VisitRequest.status == "Pending")
        .count()
    )

    return {
        "activeStaff": active_staff,
        "inCustody": in_custody,
        "facilities": facilities,
        "pendingVisits": pending_visits,
    }
