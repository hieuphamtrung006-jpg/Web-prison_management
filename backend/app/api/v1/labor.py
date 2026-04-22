from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.labor import DailyPerformance, LaborAssignment, LaborProject
from app.db.models.prisoner import Prisoner
from app.db.models.user import User

router = APIRouter()


class AssignmentCreate(BaseModel):
    prisoner_id: int
    project_id: int
    assignment_date: date
    hours_assigned: Decimal


class PerformanceCreate(BaseModel):
    prisoner_id: int
    project_id: int
    work_date: date
    productivity: Decimal
    notes: str | None = None


@router.get("/projects")
def list_projects_missing_workers(
    on_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[dict]:
    target_date = on_date or date.today()
    assignment_subquery = (
        db.query(
            LaborAssignment.project_id,
            func.count(LaborAssignment.assignment_id).label("worker_count"),
        )
        .filter(LaborAssignment.assignment_date == target_date)
        .group_by(LaborAssignment.project_id)
        .subquery()
    )

    rows = (
        db.query(
            LaborProject.project_id,
            LaborProject.project_name,
            LaborProject.max_workers,
            func.coalesce(assignment_subquery.c.worker_count, 0).label("current_workers"),
        )
        .outerjoin(assignment_subquery, assignment_subquery.c.project_id == LaborProject.project_id)
        .filter(LaborProject.is_active.is_(True))
        .all()
    )

    result = []
    for row in rows:
        open_slots = row.max_workers - row.current_workers
        if open_slots > 0:
            result.append(
                {
                    "project_id": row.project_id,
                    "project_name": row.project_name,
                    "max_workers": row.max_workers,
                    "current_workers": row.current_workers,
                    "open_slots": open_slots,
                }
            )
    return result


@router.post("/assignments", status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> dict:
    project = db.query(LaborProject).filter(LaborProject.project_id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    current_workers = (
        db.query(func.count(LaborAssignment.assignment_id))
        .filter(
            LaborAssignment.project_id == payload.project_id,
            LaborAssignment.assignment_date == payload.assignment_date,
        )
        .scalar()
    )
    if current_workers >= project.max_workers:
        raise HTTPException(status_code=400, detail="Project has reached MaxWorkers")

    assignment = LaborAssignment(
        prisoner_id=payload.prisoner_id,
        project_id=payload.project_id,
        assigned_by=current_user.user_id,
        assignment_date=payload.assignment_date,
        hours_assigned=payload.hours_assigned,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return jsonable_encoder(assignment)


@router.post("/performance", status_code=status.HTTP_201_CREATED)
def create_performance(
    payload: PerformanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
) -> dict:
    performance = DailyPerformance(
        prisoner_id=payload.prisoner_id,
        project_id=payload.project_id,
        evaluated_by=current_user.user_id,
        work_date=payload.work_date,
        productivity=payload.productivity,
        notes=payload.notes,
    )
    db.add(performance)
    db.flush()

    avg_score = (
        db.query(func.avg(DailyPerformance.productivity))
        .filter(DailyPerformance.prisoner_id == payload.prisoner_id)
        .scalar()
    )
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == payload.prisoner_id).first()
    if prisoner and avg_score is not None:
        prisoner.productivity_score = avg_score

    db.commit()
    db.refresh(performance)
    return jsonable_encoder(performance)


@router.get("/performance/prisoner/{prisoner_id}")
def get_prisoner_performance_30_days(
    prisoner_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[dict]:
    start_date = date.today() - timedelta(days=30)
    rows = (
        db.query(DailyPerformance.work_date, DailyPerformance.productivity)
        .filter(
            DailyPerformance.prisoner_id == prisoner_id,
            DailyPerformance.work_date >= start_date,
        )
        .order_by(DailyPerformance.work_date.asc())
        .all()
    )
    return [{"work_date": str(row.work_date), "productivity": float(row.productivity)} for row in rows]
