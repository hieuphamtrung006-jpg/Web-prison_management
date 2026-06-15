from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, cast, Date as SQLDate, text
from sqlalchemy.orm import Session

from fastapi import Request

from app.core.audit import set_audit_context
from app.core.deps import get_db, require_roles
from app.core.security import execute_viewer_query, get_table_name_for_role
from app.db.models.user import User
from app.db.models.labor import DailyPerformance, LaborAssignment, LaborProject
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.schedule import Schedule
from app.db.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.labor import (
    DailyPerformanceCreate,
    DailyPerformanceRead,
    DailyPerformanceReadBasic,
    LaborAssignmentCreate,
    LaborAssignmentRead,
    LaborAssignmentReadBasic,
    LaborAssignmentUpdate,
    LaborProjectCreate,
    LaborProjectRead,
    LaborProjectReadBasic,
    LaborProjectSummary,
    LaborProjectUpdate,
    PrisonerPerformancePoint,
)

router = APIRouter()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _get_location_or_404(db: Session, location_id: int) -> Location:
    location = db.query(Location).filter(Location.location_id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


def _get_project_or_404(db: Session, project_id: int) -> LaborProject:
    project = db.query(LaborProject).filter(LaborProject.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _current_worker_count(
    db: Session,
    project_id: int,
    target_date: date,
) -> int:
    query = db.query(func.count(func.distinct(Schedule.prisoner_id))).filter(
        Schedule.project_id == project_id,
        cast(Schedule.start_time, SQLDate) == target_date,
    )
    return query.scalar() or 0


def _project_read_from_row(row) -> LaborProjectRead:
    data = dict(row._mapping)
    data["current_workers"] = int(data.get("current_workers", 0))
    data["open_slots"] = max(int(data["max_workers"]) - data["current_workers"], 0)
    return LaborProjectRead(**data)


def _assignment_read_from_row(row) -> LaborAssignmentRead:
    return LaborAssignmentRead(**dict(row._mapping))


def _performance_read_from_row(row) -> DailyPerformanceRead:
    return DailyPerformanceRead(**dict(row._mapping))


def _validate_project_capacity(
    db: Session,
    location_id: int | None,
    max_workers: int,
    project_id: int | None = None,
) -> None:
    if location_id is None:
        return

    location = _get_location_or_404(db, location_id)
    if max_workers > location.capacity:
        raise HTTPException(status_code=400, detail="Project MaxWorkers cannot exceed location capacity")

    if project_id is None:
        return

    current_workers = _current_worker_count(db, project_id, date.today())
    if current_workers > max_workers:
        raise HTTPException(status_code=400, detail="Project MaxWorkers cannot be lower than current workers")


def _validate_project_active(project: LaborProject) -> None:
    if not project.is_active:
        raise HTTPException(status_code=400, detail="Project is inactive")


def _validate_prisoner_available(prisoner: Prisoner) -> None:
    if prisoner.status == "Released":
        raise HTTPException(status_code=400, detail="Released prisoners cannot be assigned to labor")


def _get_assignment_row_or_404(db: Session, assignment_id: int):
    row = (
        db.query(
            LaborAssignment.assignment_id,
            LaborAssignment.prisoner_id,
            Prisoner.full_name.label("prisoner_name"),
            LaborAssignment.project_id,
            LaborProject.project_name.label("project_name"),
            LaborAssignment.assigned_by,
            User.full_name.label("assigned_by_name"),
            LaborAssignment.assignment_date,
            LaborAssignment.hours_assigned,
            LaborAssignment.created_at,
            LaborAssignment.updated_at,
        )
        .join(Prisoner, Prisoner.prisoner_id == LaborAssignment.prisoner_id)
        .join(LaborProject, LaborProject.project_id == LaborAssignment.project_id)
        .outerjoin(User, User.user_id == LaborAssignment.assigned_by)
        .filter(LaborAssignment.assignment_id == assignment_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return row


@router.get("/projects", response_model=list[LaborProjectRead])
def list_projects(
    on_date: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[LaborProjectRead]:
    """
    Viewer role: load via vw_LaborProjects_Basic (using execute_viewer_query helper)
    to ensure no permission issues / column filtering at DB view level.
    current_workers approximated to 0 (Schedule not exposed to Viewer views).
    Non-Viewer: full ORM with live current_workers from Schedule.
    """
    target_date = on_date or date.today()
    offset = (page - 1) * page_size

    # Role-based data fetch for Viewer (fixes Network Error on /labor/projects for Viewer)
    # We prefer the vw_LaborProjects_Basic when it exists (via execute_viewer_query).
    # If the view has not been created yet (user has not run 04_Create_Views...), we gracefully
    # fall back to the full query (current DB connection has rights) so Viewer never sees Network Error.
    table_name = get_table_name_for_role("LaborProjects", current_user.role)
    if table_name.startswith("vw_"):
        try:
            # Viewer path: raw query against the safe Basic view
            normalized_rows = execute_viewer_query(
                db,
                table_name,
                where_clause="",
                params={"offset": offset, "limit": page_size},
                order_by="ORDER BY ProjectID DESC",
                limit_clause="OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY",
            )
            results = []
            for row in normalized_rows:
                data = dict(row)  # already snake_cased by normalize_db_row
                max_w = int(data.get("max_workers") or 1)
                data["current_workers"] = 0
                data["open_slots"] = max(max_w - 0, 0)
                if not data.get("created_at"):
                    data["created_at"] = _now_utc()
                results.append(LaborProjectRead.model_validate(data))
            return results
        except Exception:
            # Fallback: view not created yet or other issue → use full query so data still loads
            # (keeps Viewer experience working without "Network Error")
            pass

    # Non-Viewer (Admin/Warden/Guard) OR fallback for Viewer when vw_LaborProjects_Basic missing:
    # original full logic with live worker counts from Schedule.
    schedule_subquery = (
        db.query(
            Schedule.project_id.label("project_id"),
            func.count(func.distinct(Schedule.prisoner_id)).label("current_workers"),
        )
        .filter(
            cast(Schedule.start_time, SQLDate) == target_date,
            Schedule.project_id.isnot(None),
        )
        .group_by(Schedule.project_id)
        .subquery()
    )

    rows = (
        db.query(
            LaborProject.project_id,
            LaborProject.project_name,
            LaborProject.location_id,
            Location.location_name.label("location_name"),
            LaborProject.revenue_per_hour,
            LaborProject.priority_score,
            LaborProject.max_workers,
            func.coalesce(schedule_subquery.c.current_workers, 0).label("current_workers"),
            LaborProject.required_skills,
            LaborProject.is_active,
            LaborProject.created_at,
            LaborProject.updated_at,
        )
        .outerjoin(Location, Location.location_id == LaborProject.location_id)
        .outerjoin(schedule_subquery, schedule_subquery.c.project_id == LaborProject.project_id)
        .order_by(LaborProject.project_id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [_project_read_from_row(row) for row in rows]


@router.get("/projects/{project_id}", response_model=LaborProjectRead)
def get_project(
    project_id: int,
    on_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> LaborProjectRead:
    target_date = on_date or date.today()
    project = _get_project_or_404(db, project_id)

    row = (
        db.query(
            LaborProject.project_id,
            LaborProject.project_name,
            LaborProject.location_id,
            Location.location_name.label("location_name"),
            LaborProject.revenue_per_hour,
            LaborProject.priority_score,
            LaborProject.max_workers,
            func.count(func.distinct(Schedule.prisoner_id)).label("current_workers"),
            LaborProject.required_skills,
            LaborProject.is_active,
            LaborProject.created_at,
            LaborProject.updated_at,
        )
        .outerjoin(Location, Location.location_id == LaborProject.location_id)
        .outerjoin(
            Schedule,
            (Schedule.project_id == LaborProject.project_id)
            & (cast(Schedule.start_time, SQLDate) == target_date),
        )
        .filter(LaborProject.project_id == project.project_id)
        .group_by(
            LaborProject.project_id,
            LaborProject.project_name,
            LaborProject.location_id,
            Location.location_name,
            LaborProject.revenue_per_hour,
            LaborProject.priority_score,
            LaborProject.max_workers,
            LaborProject.required_skills,
            LaborProject.is_active,
            LaborProject.created_at,
            LaborProject.updated_at,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_read_from_row(row)


@router.post("/projects", response_model=LaborProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: LaborProjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> LaborProjectRead:
    if payload.location_id is not None:
        _validate_project_capacity(db, payload.location_id, payload.max_workers)

    project = LaborProject(**payload.model_dump())
    project.created_at = _now_utc()
    db.add(project)
    db.commit()
    db.refresh(project)
    return get_project(project.project_id, db=db, _=None)  # type: ignore[arg-type]


@router.put("/projects/{project_id}", response_model=LaborProjectRead)
def update_project(
    project_id: int,
    payload: LaborProjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> LaborProjectRead:
    project = _get_project_or_404(db, project_id)
    update_data = payload.model_dump(exclude_unset=True)

    candidate_location_id = update_data.get("location_id", project.location_id)
    candidate_max_workers = update_data.get("max_workers", project.max_workers)
    if candidate_location_id is not None and candidate_max_workers is not None:
        _validate_project_capacity(db, candidate_location_id, candidate_max_workers)

    if candidate_max_workers is not None:
        current_workers = _current_worker_count(db, project_id, date.today())
        if current_workers > candidate_max_workers:
            raise HTTPException(status_code=400, detail="Project MaxWorkers cannot be lower than current workers")

    for field, value in update_data.items():
        setattr(project, field, value)
    project.updated_at = _now_utc()

    db.commit()
    db.refresh(project)
    return get_project(project.project_id, db=db, _=None)  # type: ignore[arg-type]


@router.delete("/projects/{project_id}", response_model=MessageResponse)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> MessageResponse:
    project = _get_project_or_404(db, project_id)

    # Check constraints with counts for detailed error message
    assignment_count = (
        db.query(func.count(LaborAssignment.assignment_id))
        .filter(LaborAssignment.project_id == project_id)
        .scalar()
    ) or 0

    performance_count = (
        db.query(func.count(DailyPerformance.performance_id))
        .filter(DailyPerformance.project_id == project_id)
        .scalar()
    ) or 0

    schedule_count = (
        db.query(func.count(Schedule.schedule_id))
        .filter(Schedule.project_id == project_id)
        .scalar()
    ) or 0

    constraints = []
    if assignment_count > 0:
        constraints.append(f"- {assignment_count} Assignments đang liên kết")
    if performance_count > 0:
        constraints.append(f"- {performance_count} Daily Performances đã ghi nhận")
    if schedule_count > 0:
        constraints.append(f"- {schedule_count} Schedules đang sử dụng")

    if constraints:
        msg = "Không thể xóa dự án vì còn ràng buộc:\n" + "\n".join(constraints)
        raise HTTPException(status_code=400, detail=msg)

    db.delete(project)
    db.commit()
    return MessageResponse(detail="Project deleted")


@router.get("/assignments", response_model=list[LaborAssignmentRead] | list[LaborAssignmentReadBasic])
def list_assignments(
    prisoner_id: int | None = Query(default=None, gt=0),
    project_id: int | None = Query(default=None, gt=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[LaborAssignmentRead] | list[LaborAssignmentReadBasic]:
    """
    Viewer sẽ query vw_LaborAssignments_Basic thay vì bảng gốc (sử dụng execute_viewer_query + Basic schema).
    Sử dụng response_model Union để tránh validation error khi trả Basic (thiếu joined names + timestamps) -> loại bỏ Network Error.
    """
    table_name = get_table_name_for_role("LaborAssignments", current_user.role)

    if table_name.startswith("vw_"):
        # Viewer path: raw select from view (các cột trong view có thể đã được alias sẵn)
        # FIX: where_clause không prefix "WHERE " (execute_viewer_query sẽ tự thêm " WHERE " + where_clause)
        # Khớp logic với list_performance viewer path.
        offset = (page - 1) * page_size
        conditions = []
        params = {"offset": offset, "limit": page_size}

        if prisoner_id:
            conditions.append("PrisonerID = :prisoner_id")
            params["prisoner_id"] = prisoner_id
        if project_id:
            conditions.append("ProjectID = :project_id")
            params["project_id"] = project_id

        where = " AND ".join(conditions) if conditions else ""
        normalized_rows = execute_viewer_query(
            db,
            table_name,
            where_clause=where,
            params=params,
            order_by="ORDER BY AssignmentID DESC",
            limit_clause="OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY",
        )

        # Defensive: skip any rows that have NULL for critical FKs (e.g. bad data in LaborAssignments.ProjectID).
        # This prevents the exact Pydantic error: "LaborAssignmentReadBasic project_id Input should be a valid integer [None]".
        # Viewer gets a clean list; non-Viewer path uses joins which usually enforce non-null.
        safe_rows = [
            row for row in normalized_rows
            if row.get("project_id") is not None and row.get("prisoner_id") is not None
        ]
        return [LaborAssignmentReadBasic.model_validate(row) for row in safe_rows]

    else:
        # Non-viewer: giữ logic join phức tạp như cũ
        query = (
            db.query(
                LaborAssignment.assignment_id,
                LaborAssignment.prisoner_id,
                Prisoner.full_name.label("prisoner_name"),
                LaborAssignment.project_id,
                LaborProject.project_name.label("project_name"),
                LaborAssignment.assigned_by,
                User.full_name.label("assigned_by_name"),
                LaborAssignment.assignment_date,
                LaborAssignment.hours_assigned,
                LaborAssignment.created_at,
                LaborAssignment.updated_at,
            )
            .join(Prisoner, Prisoner.prisoner_id == LaborAssignment.prisoner_id)
            .join(LaborProject, LaborProject.project_id == LaborAssignment.project_id)
            .outerjoin(User, User.user_id == LaborAssignment.assigned_by)
        )

        if prisoner_id is not None:
            query = query.filter(LaborAssignment.prisoner_id == prisoner_id)
        if project_id is not None:
            query = query.filter(LaborAssignment.project_id == project_id)

        offset = (page - 1) * page_size
        rows = query.order_by(LaborAssignment.assignment_date.desc(), LaborAssignment.assignment_id.desc()).offset(offset).limit(page_size).all()
        return [_assignment_read_from_row(row) for row in rows]


@router.post("/assignments", response_model=LaborAssignmentRead, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: LaborAssignmentCreate,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == payload.prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")
    _validate_prisoner_available(prisoner)

    project = _get_project_or_404(db, payload.project_id)
    _validate_project_active(project)

    existing_assignment = (
        db.query(LaborAssignment.assignment_id)
        .filter(
            LaborAssignment.prisoner_id == payload.prisoner_id,
            LaborAssignment.project_id == payload.project_id,
            LaborAssignment.assignment_date == payload.assignment_date,
        )
        .first()
    )
    if existing_assignment:
        raise HTTPException(status_code=400, detail="Prisoner is already assigned to this project on the selected date")

    current_workers = _current_worker_count(db, payload.project_id, payload.assignment_date)
    if current_workers >= project.max_workers:
        raise HTTPException(status_code=400, detail="Project has reached MaxWorkers")

    assignment = LaborAssignment(
        prisoner_id=payload.prisoner_id,
        project_id=payload.project_id,
        assigned_by=current_user.user_id,
        assignment_date=payload.assignment_date,
        hours_assigned=payload.hours_assigned,
    )
    assignment.created_at = _now_utc()
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return LaborAssignmentRead(
        assignment_id=assignment.assignment_id,
        prisoner_id=prisoner.prisoner_id,
        prisoner_name=prisoner.full_name,
        project_id=project.project_id,
        project_name=project.project_name,
        assigned_by=current_user.user_id,
        assigned_by_name=current_user.full_name,
        assignment_date=assignment.assignment_date,
        hours_assigned=assignment.hours_assigned,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


@router.get("/assignments/{assignment_id}", response_model=LaborAssignmentRead)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> LaborAssignmentRead:
    row = _get_assignment_row_or_404(db, assignment_id)
    return _assignment_read_from_row(row)


@router.put("/assignments/{assignment_id}", response_model=LaborAssignmentRead)
def update_assignment(
    assignment_id: int,
    payload: LaborAssignmentUpdate,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)
    assignment = db.query(LaborAssignment).filter(LaborAssignment.assignment_id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = payload.model_dump(exclude_unset=True)

    next_prisoner_id = update_data.get("prisoner_id", assignment.prisoner_id)
    next_project_id = update_data.get("project_id", assignment.project_id)
    next_assignment_date = update_data.get("assignment_date", assignment.assignment_date)
    next_hours = update_data.get("hours_assigned", assignment.hours_assigned)

    if next_hours is None or Decimal(str(next_hours)) <= 0:
        raise HTTPException(status_code=400, detail="hours_assigned must be greater than 0")

    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == next_prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")
    _validate_prisoner_available(prisoner)

    project = _get_project_or_404(db, next_project_id)
    _validate_project_active(project)

    duplicate = (
        db.query(LaborAssignment.assignment_id)
        .filter(
            LaborAssignment.prisoner_id == next_prisoner_id,
            LaborAssignment.project_id == next_project_id,
            LaborAssignment.assignment_date == next_assignment_date,
            LaborAssignment.assignment_id != assignment_id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Prisoner is already assigned to this project on the selected date")

    current_workers = _current_worker_count(
        db,
        next_project_id,
        next_assignment_date,
    )
    if current_workers >= project.max_workers:
        raise HTTPException(status_code=400, detail="Project has reached MaxWorkers")

    assignment.prisoner_id = next_prisoner_id
    assignment.project_id = next_project_id
    assignment.assignment_date = next_assignment_date
    assignment.hours_assigned = next_hours
    assignment.assigned_by = current_user.user_id
    assignment.updated_at = _now_utc()

    db.commit()
    return _assignment_read_from_row(_get_assignment_row_or_404(db, assignment_id))


@router.delete("/assignments/{assignment_id}", response_model=MessageResponse)
def delete_assignment(
    assignment_id: int,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)
    assignment = db.query(LaborAssignment).filter(LaborAssignment.assignment_id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    db.delete(assignment)
    db.commit()
    return MessageResponse(detail="Assignment deleted")


@router.get("/performance", response_model=list[DailyPerformanceRead] | list[DailyPerformanceReadBasic])
def list_performance(
    prisoner_id: int | None = Query(default=None, gt=0),
    project_id: int | None = Query(default=None, gt=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[DailyPerformanceRead] | list[DailyPerformanceReadBasic]:
    table_name = get_table_name_for_role("DailyPerformance", current_user.role)

    if table_name.startswith("vw_"):
        offset = (page - 1) * page_size
        conditions = []
        params = {"offset": offset, "limit": page_size}
        if prisoner_id:
            conditions.append("PrisonerID = :prisoner_id")
            params["prisoner_id"] = prisoner_id
        if project_id:
            conditions.append("ProjectID = :project_id")
            params["project_id"] = project_id

        where = " AND ".join(conditions) if conditions else ""
        normalized_rows = execute_viewer_query(
            db,
            table_name,
            where_clause=where,
            params=params,
            order_by="ORDER BY WorkDate DESC",
            limit_clause="OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY",
        )
        return [DailyPerformanceReadBasic.model_validate(row) for row in normalized_rows]

    else:
        # Non-viewer full logic (original join logic)
        query = (
        db.query(
            DailyPerformance.performance_id,
            DailyPerformance.prisoner_id,
            Prisoner.full_name.label("prisoner_name"),
            DailyPerformance.project_id,
            LaborProject.project_name.label("project_name"),
            DailyPerformance.evaluated_by,
            User.full_name.label("evaluated_by_name"),
            DailyPerformance.work_date,
            DailyPerformance.productivity,
            DailyPerformance.notes,
            DailyPerformance.created_at,
        )
        .join(Prisoner, Prisoner.prisoner_id == DailyPerformance.prisoner_id)
        .join(LaborProject, LaborProject.project_id == DailyPerformance.project_id)
        .outerjoin(User, User.user_id == DailyPerformance.evaluated_by)
    )

    if prisoner_id is not None:
        query = query.filter(DailyPerformance.prisoner_id == prisoner_id)
    if project_id is not None:
        query = query.filter(DailyPerformance.project_id == project_id)

    offset = (page - 1) * page_size
    rows = query.order_by(DailyPerformance.work_date.desc(), DailyPerformance.performance_id.desc()).offset(offset).limit(page_size).all()
    return [_performance_read_from_row(row) for row in rows]


@router.post("/performance", response_model=DailyPerformanceRead, status_code=status.HTTP_201_CREATED)
def create_performance(
    payload: DailyPerformanceCreate,
    request: Request,
    current_user: User = Depends(require_roles("Admin", "Warden", "Guard")),
    db: Session = Depends(get_db),
):
    # Set audit context manually
    client_ip = request.client.host if request.client else None
    set_audit_context(db, current_user.user_id, client_ip)
    prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == payload.prisoner_id).first()
    if not prisoner:
        raise HTTPException(status_code=404, detail="Prisoner not found")
    _validate_prisoner_available(prisoner)

    project = _get_project_or_404(db, payload.project_id)
    _validate_project_active(project)

    performance = DailyPerformance(
        prisoner_id=payload.prisoner_id,
        project_id=payload.project_id,
        evaluated_by=current_user.user_id,
        work_date=payload.work_date,
        productivity=payload.productivity,
        notes=payload.notes,
    )
    performance.created_at = _now_utc()
    db.add(performance)
    db.flush()

    avg_score = (
        db.query(func.avg(DailyPerformance.productivity))
        .filter(DailyPerformance.prisoner_id == payload.prisoner_id)
        .scalar()
    )
    if avg_score is not None:
        prisoner.productivity_score = Decimal(str(avg_score))

    db.commit()
    db.refresh(performance)

    return DailyPerformanceRead(
        performance_id=performance.performance_id,
        prisoner_id=prisoner.prisoner_id,
        prisoner_name=prisoner.full_name,
        project_id=project.project_id,
        project_name=project.project_name,
        evaluated_by=current_user.user_id,
        evaluated_by_name=current_user.full_name,
        work_date=performance.work_date,
        productivity=performance.productivity,
        notes=performance.notes,
        created_at=performance.created_at,
    )


@router.get("/performance/{performance_id}", response_model=DailyPerformanceRead)
def get_performance(
    performance_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> DailyPerformanceRead:
    row = (
        db.query(
            DailyPerformance.performance_id,
            DailyPerformance.prisoner_id,
            Prisoner.full_name.label("prisoner_name"),
            DailyPerformance.project_id,
            LaborProject.project_name.label("project_name"),
            DailyPerformance.evaluated_by,
            User.full_name.label("evaluated_by_name"),
            DailyPerformance.work_date,
            DailyPerformance.productivity,
            DailyPerformance.notes,
            DailyPerformance.created_at,
        )
        .join(Prisoner, Prisoner.prisoner_id == DailyPerformance.prisoner_id)
        .join(LaborProject, LaborProject.project_id == DailyPerformance.project_id)
        .outerjoin(User, User.user_id == DailyPerformance.evaluated_by)
        .filter(DailyPerformance.performance_id == performance_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Performance not found")
    return _performance_read_from_row(row)


@router.get("/performance/prisoner/{prisoner_id}", response_model=list[PrisonerPerformancePoint])
def get_prisoner_performance_30_days(
    prisoner_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[PrisonerPerformancePoint]:
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
    return [
        PrisonerPerformancePoint(work_date=row.work_date, productivity=float(row.productivity))
        for row in rows
    ]