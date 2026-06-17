from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from typing import Any

from ortools.sat.python import cp_model


def _to_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))


def _load_parameters(parameters: str | None) -> dict[str, float]:
    defaults = {
        "time_limit_seconds": 12,
    }
    if not parameters:
        return defaults

    try:
        raw = json.loads(parameters)
    except json.JSONDecodeError:
        return defaults

    mapped = {
        "time_limit_seconds": raw.get(
            "TimeLimitSeconds", raw.get("time_limit_seconds", defaults["time_limit_seconds"])
        ),
    }
    return {
        "time_limit_seconds": max(5, float(mapped["time_limit_seconds"])),
    }


def _classify_shift(shift_type: str | None) -> str:
    if not shift_type:
        return "general"
    value = shift_type.lower()
    if "lao" in value or "work" in value or "xuong" in value:
        return "labor"
    
    # Check for meal shifts safely using word matching
    is_meal = False
    if "meal" in value or "dining" in value:
        is_meal = True
    else:
        words = value.replace("/", " ").replace("&", " ").split()
        if "an" in words or "ăn" in words:
            is_meal = True
            
    if is_meal:
        return "meal"

    # Check for sleep shifts safely
    is_sleep = False
    if "sleep" in value or "night" in value or "khoa" in value or "khóa" in value or "diem danh" in value or "điểm danh" in value:
        is_sleep = True
    else:
        words = value.replace("/", " ").replace("&", " ").split()
        if "ngu" in words or "ngủ" in words:
            is_sleep = True

    if is_sleep:
        return "sleep"

    # Check for yard/recreation/activity shifts
    is_yard = False
    if "yard" in value or "playground" in value:
        is_yard = True
    else:
        words = value.replace("/", " ").replace("&", " ").split()
        activity_keywords = {"sinh", "hoạt", "hoat", "tự", "do", "tu", "thể", "dục", "the", "duc"}
        if any(w in words for w in activity_keywords):
            is_yard = True

    if is_yard:
        return "yard"

    if value in {"sang", "chieu", "morning", "afternoon"}:
        return "labor"
    return "general"



def _scaled(value: float, scale: int) -> int:
    return int(round(value * scale))


def run_genetic_algorithm(payload: dict[str, Any]) -> dict[str, Any]:
    """Generate prison schedules using CP-SAT (OR-Tools).

    Input payload must include:
    - config with weight_* and parameters
    - prisoners (prisoner_id, risk_level, productivity_score)
    - locations (location_id, capacity, type, security_level)
    - shifts (shift_id, shift_type, start_time, end_time, is_for_staff)
    - assignments (prisoner_id, project_id)
    - projects (project_id, location_id, max_workers, revenue_per_hour)
    """

    config = payload.get("config", {})
    params = _load_parameters(config.get("parameters"))
    prisoners = payload.get("prisoners", [])
    locations = payload.get("locations", [])
    shifts = [s for s in payload.get("shifts", []) if not bool(s.get("is_for_staff"))]
    assignments = payload.get("assignments", [])
    projects_list = payload.get("projects", [])

    if not prisoners or not locations or not shifts:
        return {
            "status": "no_data",
            "schedules": [],
            "meta": {"reason": "Missing prisoners, locations, or inmate shifts"},
        }

    projects = {int(p["project_id"]): p for p in projects_list}
    shifts = sorted(shifts, key=lambda item: int(item["shift_id"]))
    prisoners_by_id = {int(p["prisoner_id"]): p for p in prisoners}
    locations_by_id = {int(l["location_id"]): l for l in locations}
    project_by_location: dict[int, dict] = {}
    for p in projects_list:
        loc_id = p.get("location_id")
        if loc_id is not None:
            project_by_location[int(loc_id)] = p

    prisoner_ids = [int(p["prisoner_id"]) for p in prisoners]
    shift_ids = [int(s["shift_id"]) for s in shifts]
    location_ids = [int(l["location_id"]) for l in locations]

    max_workers_by_project_shift: dict[tuple[int, int], int] = {}
    for project in projects_list:
        project_id = int(project["project_id"])
        max_workers = int(project.get("max_workers") or 0)
        for shift in shifts:
            shift_id = int(shift["shift_id"])
            if _classify_shift(shift.get("shift_type")) == "labor":
                max_workers_by_project_shift[(project_id, shift_id)] = max_workers
            else:
                max_workers_by_project_shift[(project_id, shift_id)] = 0

    model = cp_model.CpModel()
    x: dict[tuple[int, int, int], cp_model.IntVar] = {}

    for prisoner_id in prisoner_ids:
        for shift in shifts:
            shift_id = int(shift["shift_id"])
            for location_id in location_ids:
                x[(prisoner_id, shift_id, location_id)] = model.NewBoolVar(
                    f"x_p{prisoner_id}_s{shift_id}_l{location_id}"
                )

    # Each prisoner must be assigned to exactly one location per shift.
    for prisoner_id in prisoner_ids:
        for shift in shifts:
            shift_id = int(shift["shift_id"])
            model.Add(
                sum(x[(prisoner_id, shift_id, loc_id)] for loc_id in location_ids) == 1
            )

            shift_class = _classify_shift(shift.get("shift_type"))
            if shift_class == "sleep":
                prisoner_obj = prisoners_by_id.get(prisoner_id, {})
                current_loc_id = prisoner_obj.get("current_location_id")
                if current_loc_id is not None and current_loc_id in location_ids:
                    for loc_id in location_ids:
                        if loc_id == current_loc_id:
                            model.Add(x[(prisoner_id, shift_id, loc_id)] == 1)
                        else:
                            model.Add(x[(prisoner_id, shift_id, loc_id)] == 0)
                else:
                    cell_locs = [lid for lid, loc in locations_by_id.items() if str(loc.get("type")).lower() == "cell"]
                    if cell_locs:
                        model.Add(sum(x[(prisoner_id, shift_id, lid)] for lid in cell_locs) == 1)
            elif shift_class == "meal":
                meal_locs = [lid for lid, loc in locations_by_id.items() if str(loc.get("type")).lower() in {"dining", "cell"}]
                if meal_locs:
                    model.Add(sum(x[(prisoner_id, shift_id, lid)] for lid in meal_locs) == 1)
            elif shift_class == "labor":
                project_loc_ids = [int(p["location_id"]) for p in projects_list if p.get("location_id") is not None]
                project_loc_ids = list(set([lid for lid in project_loc_ids if lid in location_ids]))
                
                total_project_capacity = sum(int(p.get("max_workers") or 0) for p in projects_list)
                if project_loc_ids:
                    if len(prisoner_ids) <= total_project_capacity:
                        model.Add(sum(x[(prisoner_id, shift_id, lid)] for lid in project_loc_ids) == 1)
                    else:
                        cell_locs = [lid for lid, loc in locations_by_id.items() if str(loc.get("type")).lower() == "cell"]
                        allowed_locs = list(set(project_loc_ids + cell_locs))
                        if allowed_locs:
                            model.Add(sum(x[(prisoner_id, shift_id, lid)] for lid in allowed_locs) == 1)
            elif shift_class == "yard":
                yard_locs = [lid for lid, loc in locations_by_id.items() if str(loc.get("type")).lower() == "yard"]
                cell_locs = [lid for lid, loc in locations_by_id.items() if str(loc.get("type")).lower() == "cell"]
                
                prisoner_obj = prisoners_by_id.get(prisoner_id, {})
                risk = (prisoner_obj.get("risk_level") or "Medium").lower()
                
                if risk == "high":
                    # High risk prisoners can be assigned to yard or cell
                    allowed_locs = list(set(yard_locs + cell_locs))
                else:
                    # Low/Medium risk prisoners must be assigned to yard
                    allowed_locs = yard_locs
                
                if allowed_locs:
                    model.Add(sum(x[(prisoner_id, shift_id, lid)] for lid in allowed_locs) == 1)

    # Capacity constraints per shift and location.
    for shift_id in shift_ids:
        for location_id in location_ids:
            capacity = int(locations_by_id.get(location_id, {}).get("capacity") or 0)
            model.Add(
                sum(x[(prisoner_id, shift_id, location_id)] for prisoner_id in prisoner_ids)
                <= capacity
            )

    # Project max workers per labor shift.
    for (project_id, shift_id), max_workers in max_workers_by_project_shift.items():
        if max_workers <= 0:
            continue
        project = projects.get(project_id)
        if not project or project.get("location_id") is None:
            continue
        location_id = int(project["location_id"])
        if location_id in location_ids:
            model.Add(
                sum(x[(pid, shift_id, location_id)] for pid in prisoner_ids) <= max_workers
            )

    # Objective: maximize weighted economy + rehab - security penalty.
    w_economy = float(config.get("weight_economy", 0.4))
    w_security = float(config.get("weight_security", 0.3))
    w_rehab = float(config.get("weight_rehab", 0.3))
    scale = 100

    objective_terms: list[cp_model.LinearExpr] = []

    for prisoner_id in prisoner_ids:
        prisoner = prisoners_by_id.get(prisoner_id, {})
        risk = (prisoner.get("risk_level") or "Medium").lower()
        productivity = float(prisoner.get("productivity_score") or 0)

        for shift in shifts:
            shift_id = int(shift["shift_id"])
            shift_class = _classify_shift(shift.get("shift_type"))

            for location_id in location_ids:
                location = locations_by_id.get(location_id, {})
                loc_type = str(location.get("type") or "").lower()
                loc_security = str(location.get("security_level") or "").lower()

                economy_gain = 0.0
                rehab_gain = 0.0
                security_penalty = 0.0

                if shift_class == "labor":
                    project = project_by_location.get(location_id)
                    if project:
                        economy_gain += 100.0 + productivity + float(project.get("revenue_per_hour") or 0) / 100.0
                elif shift_class in {"general", "yard"}:
                    if loc_type in {"yard", "hospital"}:
                        rehab_gain += 1.0

                if risk == "high":
                    if loc_type == "yard":
                        security_penalty += 2.0
                    if loc_security not in {"high", "max"}:
                        security_penalty += 1.5

                score = (w_economy * economy_gain) + (w_rehab * rehab_gain) - (w_security * security_penalty)
                coef = _scaled(score, scale)
                if coef != 0:
                    objective_terms.append(coef * x[(prisoner_id, shift_id, location_id)])

    if objective_terms:
        model.Maximize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(params["time_limit_seconds"])

    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "status": "infeasible",
            "schedules": [],
            "meta": {
                "reason": "No feasible solution",
                "solver_status": solver.StatusName(status),
            },
        }

    schedules: list[dict] = []
    for shift in shifts:
        shift_id = int(shift["shift_id"])
        shift_start = _to_datetime(shift["start_time"])
        shift_end = _to_datetime(shift["end_time"])
        shift_class = _classify_shift(shift.get("shift_type"))

        for prisoner_id in prisoner_ids:
            chosen_location_id = None
            for location_id in location_ids:
                if solver.BooleanValue(x[(prisoner_id, shift_id, location_id)]):
                    chosen_location_id = location_id
                    break

            project_id = None
            if shift_class == "labor" and chosen_location_id is not None:
                project = project_by_location.get(chosen_location_id)
                if project:
                    project_id = int(project["project_id"])

            schedules.append(
                {
                    "prisoner_id": prisoner_id,
                    "project_id": project_id,
                    "location_id": chosen_location_id,
                    "shift_id": shift_id,
                    "start_time": shift_start,
                    "end_time": shift_end,
                }
            )

    return {
        "status": "ok",
        "schedules": schedules,
        "meta": {
            "solver_status": solver.StatusName(status),
            "objective": solver.ObjectiveValue() if objective_terms else 0,
            "schedule_rows": len(schedules),
            "time_limit_seconds": params["time_limit_seconds"],
        },
    }
