from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast
from sqlalchemy import Date as SQLDate
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.labor import LaborAssignment, LaborProject
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.schedule import Schedule, SchedulingConfig, Shift
from app.db.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.schedule import (
    ScheduleConfigRead,
    ScheduleConfigUpdate,
    ScheduleDailyResponse,
    ScheduleGenerateRequest,
    ScheduleGenerateResponse,
    ScheduleRead,
    ScheduleUpdate,
)
from app.services.ai_engine import run_genetic_algorithm

router = APIRouter()


@router.get("/configs", response_model=list[ScheduleConfigRead])
def list_configs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[ScheduleConfigRead]:
    offset = (page - 1) * page_size
    rows = (
        db.query(SchedulingConfig)
        .order_by(SchedulingConfig.config_id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [ScheduleConfigRead.model_validate(row) for row in rows]


@router.get("/configs/{config_id}", response_model=ScheduleConfigRead)
def get_config(
    config_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> ScheduleConfigRead:
    config = db.query(SchedulingConfig).filter(SchedulingConfig.config_id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return ScheduleConfigRead.model_validate(config)


@router.put("/configs/{config_id}", response_model=ScheduleConfigRead)
def update_config(
    config_id: int,
    payload: ScheduleConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> ScheduleConfigRead:
    config = db.query(SchedulingConfig).filter(SchedulingConfig.config_id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    config.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(config)
    return ScheduleConfigRead.model_validate(config)


@router.get("/", response_model=list[ScheduleRead])
def list_schedules(
    target_date: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[ScheduleRead]:
    query = db.query(Schedule)
    if target_date:
        query = query.filter(cast(Schedule.start_time, SQLDate) == target_date)
    offset = (page - 1) * page_size
    rows = query.order_by(Schedule.schedule_id.desc()).offset(offset).limit(page_size).all()
    return [ScheduleRead.model_validate(row) for row in rows]


@router.get("/{schedule_id}", response_model=ScheduleRead)
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> ScheduleRead:
    schedule = db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return ScheduleRead.model_validate(schedule)


def _fallback_schedule(prisoners: list[Prisoner], projects: list[LaborProject], shifts: list[Shift], target_date: date) -> list[dict]:
    if not shifts:
        return []

    default_shift = shifts[0]
    start = datetime.combine(target_date, default_shift.start_time or time(8, 0))
    end = datetime.combine(target_date, default_shift.end_time or time(12, 0))
    entries: list[dict] = []
    for idx, prisoner in enumerate(prisoners):
        project = projects[idx % len(projects)] if projects else None
        entries.append(
            {
                "prisoner_id": prisoner.prisoner_id,
                "project_id": project.project_id if project else None,
                "location_id": project.location_id if project else prisoner.current_location_id,
                "shift_id": default_shift.shift_id,
                "start_time": start,
                "end_time": end,
            }
        )
    return entries


@router.post("/generate", response_model=ScheduleGenerateResponse)
def generate_schedule(
    payload: ScheduleGenerateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> ScheduleGenerateResponse:
    config = db.query(SchedulingConfig).filter(SchedulingConfig.config_id == payload.config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    target_date = payload.target_date or (date.today() + timedelta(days=1))
    prisoners = db.query(Prisoner).filter(Prisoner.status == "InPrison").all()
    projects = db.query(LaborProject).filter(LaborProject.is_active == True).all()
    shifts = db.query(Shift).all()
    locations = db.query(Location).filter(Location.is_active == True).all()
    assignment_rows = (
        db.query(LaborAssignment)
        .filter(LaborAssignment.assignment_date <= target_date)
        .order_by(LaborAssignment.prisoner_id.asc(), LaborAssignment.assignment_date.desc())
        .all()
    )
    assignments_map: dict[int, LaborAssignment] = {}
    for row in assignment_rows:
        if row.prisoner_id not in assignments_map:
            assignments_map[row.prisoner_id] = row
    assignments = list(assignments_map.values())

    ai_result = run_genetic_algorithm(
        {
            "target_date": target_date.isoformat(),
            "config": {
                "id": config.config_id,
                "weight_economy": float(config.weight_economy),
                "weight_security": float(config.weight_security),
                "weight_rehab": float(config.weight_rehab),
                "parameters": config.parameters,
            },
            "prisoners": [
                {
                    "prisoner_id": p.prisoner_id,
                    "risk_level": p.risk_level,
                    "productivity_score": float(p.productivity_score),
                }
                for p in prisoners
            ],
            "projects": [
                {
                    "project_id": p.project_id,
                    "location_id": p.location_id,
                    "max_workers": p.max_workers,
                    "revenue_per_hour": float(p.revenue_per_hour),
                }
                for p in projects
            ],
            "assignments": [
                {
                    "prisoner_id": a.prisoner_id,
                    "project_id": a.project_id,
                }
                for a in assignments
            ],
            "shifts": [
                {
                    "shift_id": s.shift_id,
                    "shift_type": s.shift_type,
                    "start_time": datetime.combine(target_date, s.start_time),
                    "end_time": datetime.combine(target_date, s.end_time),
                    "is_for_staff": s.is_for_staff,
                }
                for s in shifts
            ],
            "locations": [
                {
                    "location_id": l.location_id,
                    "type": l.type,
                    "capacity": l.capacity,
                    "security_level": l.security_level,
                }
                for l in locations
            ],
        }
    )

    generated = ai_result.get("schedules") if isinstance(ai_result, dict) else None
    if not generated:
        generated = _fallback_schedule(prisoners, projects, shifts, target_date)

    db.query(Schedule).filter(cast(Schedule.start_time, SQLDate) == target_date).delete(
        synchronize_session=False
    )

    to_insert = [
        Schedule(
            prisoner_id=item["prisoner_id"],
            project_id=item.get("project_id"),
            location_id=item.get("location_id"),
            shift_id=item["shift_id"],
            start_time=item["start_time"],
            end_time=item["end_time"],
            status="Active",
        )
        for item in generated
    ]
    if to_insert:
        db.bulk_save_objects(to_insert)

    config.last_run = datetime.now(timezone.utc)
    config.updated_at = datetime.now(timezone.utc)
    db.commit()

    return ScheduleGenerateResponse(
        detail="Schedule generated",
        count=len(to_insert),
        target_date=target_date.isoformat(),
        ai_meta=ai_result.get("meta", {}),
    )


@router.put("/{schedule_id}", response_model=ScheduleRead)
def update_schedule(
    schedule_id: int,
    payload: ScheduleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> ScheduleRead:
    schedule = db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    data = payload.model_dump(exclude_unset=True)
    if "prisoner_id" in data:
        prisoner = db.query(Prisoner).filter(Prisoner.prisoner_id == data["prisoner_id"]).first()
        if not prisoner:
            raise HTTPException(status_code=404, detail="Prisoner not found")
    if "project_id" in data and data["project_id"] is not None:
        project = db.query(LaborProject).filter(LaborProject.project_id == data["project_id"]).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    if "location_id" in data and data["location_id"] is not None:
        location = db.query(Location).filter(Location.location_id == data["location_id"]).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
    if "shift_id" in data:
        shift = db.query(Shift).filter(Shift.shift_id == data["shift_id"]).first()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

    for field, value in data.items():
        setattr(schedule, field, value)
    if schedule.start_time and schedule.end_time and schedule.end_time < schedule.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    schedule.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(schedule)
    return ScheduleRead.model_validate(schedule)


@router.get("/daily", response_model=ScheduleDailyResponse)
def get_daily_schedule(
    target_date: date,
    group_by: Literal["location", "project"] = "location",
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> ScheduleDailyResponse:
    rows = (
        db.query(
            Schedule.schedule_id,
            Schedule.start_time,
            Schedule.end_time,
            Prisoner.prisoner_id,
            Prisoner.full_name,
            LaborProject.project_name,
            Location.location_name,
        )
        .join(Prisoner, Prisoner.prisoner_id == Schedule.prisoner_id)
        .outerjoin(LaborProject, LaborProject.project_id == Schedule.project_id)
        .outerjoin(Location, Location.location_id == Schedule.location_id)
        .filter(cast(Schedule.start_time, SQLDate) == target_date)
        .order_by(Schedule.start_time)
        .all()
    )

    key_name = "project_name" if group_by == "project" else "location_name"
    grouped: dict[str, list[dict]] = {}
    for row in rows:
        data = dict(row._mapping)
        key = data.get(key_name) or "Unassigned"
        grouped.setdefault(key, []).append(data)

    return ScheduleDailyResponse(
        target_date=target_date.isoformat(),
        group_by=group_by,
        groups=grouped,
    )


@router.delete("/{schedule_id}", response_model=MessageResponse)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> MessageResponse:
    schedule = db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db.delete(schedule)
    db.commit()
    return MessageResponse(detail="Schedule deleted")
