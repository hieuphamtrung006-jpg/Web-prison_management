from __future__ import annotations

import json
import random
from collections import defaultdict
from datetime import datetime
from typing import Any


def _to_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))


def _load_parameters(parameters: str | None) -> dict[str, float]:
    defaults = {
        "population_size": 80,
        "generations": 120,
        "mutation_rate": 0.08,
        "elite_size": 8,
    }
    if not parameters:
        return defaults

    try:
        raw = json.loads(parameters)
    except json.JSONDecodeError:
        return defaults

    mapped = {
        "population_size": raw.get("PopulationSize", raw.get("population_size", defaults["population_size"])),
        "generations": raw.get("Generations", raw.get("generations", defaults["generations"])),
        "mutation_rate": raw.get("MutationRate", raw.get("mutation_rate", defaults["mutation_rate"])),
        "elite_size": raw.get("EliteSize", raw.get("elite_size", defaults["elite_size"])),
    }
    return {
        "population_size": max(20, int(mapped["population_size"])),
        "generations": max(20, int(mapped["generations"])),
        "mutation_rate": min(0.5, max(0.01, float(mapped["mutation_rate"]))),
        "elite_size": max(2, int(mapped["elite_size"])),
    }


def _classify_shift(shift_type: str | None) -> str:
    if not shift_type:
        return "general"
    value = shift_type.lower()
    if "lao" in value or "work" in value or "xuong" in value:
        return "labor"
    if "an" in value or "meal" in value or "dining" in value:
        return "meal"
    if "ngu" in value or "sleep" in value or "night" in value:
        return "sleep"
    if value in {"sang", "chieu", "morning", "afternoon"}:
        return "labor"
    return "general"


def _location_groups(locations: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for location in locations:
        groups[(location.get("type") or "").lower()].append(location)
    return groups


def _choose_location(
    candidates: list[dict],
    occupancy: dict[tuple[int, int], int],
    shift_id: int,
    rng: random.Random,
) -> int | None:
    if not candidates:
        return None

    available = [
        loc
        for loc in candidates
        if occupancy[(shift_id, loc["location_id"])] < int(loc.get("capacity", 0) or 0)
    ]
    bucket = available if available else candidates
    chosen = rng.choice(bucket)
    occupancy[(shift_id, chosen["location_id"])] += 1
    return chosen["location_id"]


def _build_individual(
    prisoners: list[dict],
    shifts: list[dict],
    locations: list[dict],
    projects: dict[int, dict],
    assignments_by_prisoner: dict[int, dict],
    max_workers_by_project_shift: dict[tuple[int, int], int],
    rng: random.Random,
) -> list[dict]:
    location_groups = _location_groups(locations)
    occupancy: dict[tuple[int, int], int] = defaultdict(int)
    project_workers: dict[tuple[int, int], int] = defaultdict(int)
    schedule_rows: list[dict] = []

    for shift in shifts:
        shift_id = int(shift["shift_id"])
        shift_class = _classify_shift(shift.get("shift_type"))
        shift_start = _to_datetime(shift["start_time"])
        shift_end = _to_datetime(shift["end_time"])

        for prisoner in prisoners:
            prisoner_id = int(prisoner["prisoner_id"])
            assignment = assignments_by_prisoner.get(prisoner_id)
            project_id: int | None = None

            if shift_class == "labor" and assignment:
                project_id = int(assignment["project_id"])
                max_workers = max_workers_by_project_shift.get((project_id, shift_id), 0)
                if project_workers[(project_id, shift_id)] < max_workers:
                    project_workers[(project_id, shift_id)] += 1
                    project = projects.get(project_id)
                    location_id = project.get("location_id") if project else None
                    if location_id is not None:
                        occupancy[(shift_id, int(location_id))] += 1
                else:
                    project_id = None

            if project_id is None:
                if shift_class == "labor":
                    candidates = location_groups.get("workshop", [])
                    if not candidates:
                        candidates = locations
                elif shift_class == "meal":
                    candidates = location_groups.get("dining", []) or locations
                elif shift_class == "sleep":
                    candidates = location_groups.get("cell", []) or locations
                else:
                    candidates = (
                        location_groups.get("yard", [])
                        + location_groups.get("hospital", [])
                        + location_groups.get("cell", [])
                    ) or locations
                location_id = _choose_location(candidates, occupancy, shift_id, rng)
            else:
                project = projects.get(project_id)
                location_id = project.get("location_id") if project else None
                if location_id is None:
                    location_id = _choose_location(locations, occupancy, shift_id, rng)

            schedule_rows.append(
                {
                    "prisoner_id": prisoner_id,
                    "project_id": project_id,
                    "location_id": int(location_id) if location_id is not None else None,
                    "shift_id": shift_id,
                    "start_time": shift_start,
                    "end_time": shift_end,
                }
            )

    return schedule_rows


def _fitness(
    individual: list[dict],
    prisoners_by_id: dict[int, dict],
    locations_by_id: dict[int, dict],
    projects_by_id: dict[int, dict],
    config: dict,
) -> float:
    w_economy = float(config.get("weight_economy", 0.4))
    w_security = float(config.get("weight_security", 0.3))
    w_rehab = float(config.get("weight_rehab", 0.3))

    occupancy: dict[tuple[int, int], int] = defaultdict(int)
    economy_gain = 0.0
    rehabilitation_gain = 0.0
    security_penalty = 0.0

    for row in individual:
        prisoner = prisoners_by_id.get(row["prisoner_id"], {})
        location = locations_by_id.get(row.get("location_id"))
        project = projects_by_id.get(row.get("project_id"))

        if row.get("location_id") is not None:
            occupancy[(row["shift_id"], row["location_id"])] += 1

        risk = (prisoner.get("risk_level") or "Medium").lower()
        productivity = float(prisoner.get("productivity_score") or 0)

        if project:
            economy_gain += productivity + float(project.get("revenue_per_hour") or 0) / 100.0
        else:
            loc_type = (location.get("type") if location else "") or ""
            if str(loc_type).lower() in {"yard", "hospital"}:
                rehabilitation_gain += 1.0

        if risk == "high":
            loc_security = str((location.get("security_level") if location else "") or "").lower()
            loc_type = str((location.get("type") if location else "") or "").lower()
            if loc_type == "yard":
                security_penalty += 2.0
            if loc_security not in {"high", "max"}:
                security_penalty += 1.5

    for (_, location_id), count in occupancy.items():
        location = locations_by_id.get(location_id)
        capacity = int(location.get("capacity") or 0) if location else 0
        if count > capacity:
            security_penalty += (count - capacity) * 5.0

    return (w_economy * economy_gain) + (w_rehab * rehabilitation_gain) - (w_security * security_penalty)


def _crossover(parent_a: list[dict], parent_b: list[dict], rng: random.Random) -> list[dict]:
    if not parent_a:
        return []
    pivot = rng.randint(0, len(parent_a) - 1)
    return parent_a[:pivot] + parent_b[pivot:]


def _mutate(
    individual: list[dict],
    mutation_rate: float,
    shifts_by_id: dict[int, dict],
    locations: list[dict],
    assignments_by_prisoner: dict[int, dict],
    rng: random.Random,
) -> list[dict]:
    mutated = [dict(row) for row in individual]
    if not mutated:
        return mutated

    location_groups = _location_groups(locations)
    for row in mutated:
        if rng.random() > mutation_rate:
            continue

        shift = shifts_by_id.get(int(row["shift_id"]), {})
        shift_class = _classify_shift(shift.get("shift_type"))
        prisoner_id = int(row["prisoner_id"])

        if shift_class == "labor" and assignments_by_prisoner.get(prisoner_id):
            # Preserve hard assignment slots for labor shifts.
            continue

        if shift_class == "labor":
            candidates = location_groups.get("workshop", []) or locations
        elif shift_class == "meal":
            candidates = location_groups.get("dining", []) or locations
        elif shift_class == "sleep":
            candidates = location_groups.get("cell", []) or locations
        else:
            candidates = (
                location_groups.get("yard", [])
                + location_groups.get("hospital", [])
                + location_groups.get("cell", [])
            ) or locations

        if candidates:
            row["location_id"] = int(rng.choice(candidates)["location_id"])

    return mutated


def run_genetic_algorithm(payload: dict[str, Any]) -> dict[str, Any]:
    """Generate prison schedules using a GA with hard and soft constraints.

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
    shifts_by_id = {int(s["shift_id"]): s for s in shifts}
    prisoners_by_id = {int(p["prisoner_id"]): p for p in prisoners}
    locations_by_id = {int(l["location_id"]): l for l in locations}
    assignments_by_prisoner = {int(a["prisoner_id"]): a for a in assignments if a.get("project_id") is not None}

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

    seed = abs(hash(f"{payload.get('target_date', '')}:{config.get('id', 0)}")) % (2**32)
    rng = random.Random(seed)

    population_size = int(params["population_size"])
    generations = int(params["generations"])
    mutation_rate = float(params["mutation_rate"])
    elite_size = min(int(params["elite_size"]), population_size)

    population = [
        _build_individual(
            prisoners=prisoners,
            shifts=shifts,
            locations=locations,
            projects=projects,
            assignments_by_prisoner=assignments_by_prisoner,
            max_workers_by_project_shift=max_workers_by_project_shift,
            rng=rng,
        )
        for _ in range(population_size)
    ]

    best_score = float("-inf")
    best_individual: list[dict] = []

    for _ in range(generations):
        ranked = sorted(
            [
                (
                    _fitness(
                        individual,
                        prisoners_by_id=prisoners_by_id,
                        locations_by_id=locations_by_id,
                        projects_by_id=projects,
                        config=config,
                    ),
                    individual,
                )
                for individual in population
            ],
            key=lambda item: item[0],
            reverse=True,
        )

        if ranked and ranked[0][0] > best_score:
            best_score = ranked[0][0]
            best_individual = ranked[0][1]

        elites = [ind for _, ind in ranked[:elite_size]]
        next_population = elites.copy()

        while len(next_population) < population_size:
            parent_a = rng.choice(elites)
            parent_b = rng.choice(elites)
            child = _crossover(parent_a, parent_b, rng)
            child = _mutate(
                child,
                mutation_rate=mutation_rate,
                shifts_by_id=shifts_by_id,
                locations=locations,
                assignments_by_prisoner=assignments_by_prisoner,
                rng=rng,
            )
            next_population.append(child)

        population = next_population

    return {
        "status": "ok",
        "schedules": best_individual,
        "meta": {
            "population_size": population_size,
            "generations": generations,
            "mutation_rate": mutation_rate,
            "elite_size": elite_size,
            "best_fitness": best_score,
            "schedule_rows": len(best_individual),
        },
    }
