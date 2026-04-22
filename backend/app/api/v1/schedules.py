from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import cast
from sqlalchemy import Date as SQLDate
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.db.models.labor import LaborAssignment, LaborProject
from app.db.models.location import Location
from app.db.models.prisoner import Prisoner
from app.db.models.schedule import Schedule, SchedulingConfig, Shift
from app.db.models.user import User
from app.services.ai_engine import run_genetic_algorithm

router = APIRouter()


class ScheduleConfigUpdate(BaseModel):
    config_name: str | None = None
    weight_economy: float | None = None
    weight_security: float | None = None
    weight_rehab: float | None = None
    parameters: str | None = None


class ScheduleGenerateRequest(BaseModel):
    config_id: int
    target_date: date | None = None


@router.get("/configs")
def list_configs(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> list[dict]:
    rows = db.query(SchedulingConfig).order_by(SchedulingConfig.config_id).all()
    return jsonable_encoder(rows)


@router.put("/configs/{config_id}")
def update_config(
    config_id: int,
    payload: ScheduleConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> dict:
    config = db.query(SchedulingConfig).filter(SchedulingConfig.config_id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    config.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(config)
    return jsonable_encoder(config)


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


@router.post("/generate")
def generate_schedule(
    payload: ScheduleGenerateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden")),
) -> dict:
    config = db.query(SchedulingConfig).filter(SchedulingConfig.config_id == payload.config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    target_date = payload.target_date or (date.today() + timedelta(days=1))
    prisoners = db.query(Prisoner).filter(Prisoner.status == "InPrison").all()
    projects = db.query(LaborProject).filter(LaborProject.is_active.is_(True)).all()
    shifts = db.query(Shift).all()
    locations = db.query(Location).filter(Location.is_active.is_(True)).all()
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

    return {
        "detail": "Schedule generated",
        "count": len(to_insert),
        "target_date": target_date.isoformat(),
        "ai_meta": ai_result.get("meta", {}),
    }


@router.get("/daily")
def get_daily_schedule(
    target_date: date,
    group_by: str = "location",
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("Admin", "Warden", "Guard", "Viewer")),
) -> dict:
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

    return {"target_date": target_date.isoformat(), "group_by": group_by, "groups": grouped}
