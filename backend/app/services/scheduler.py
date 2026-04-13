from app.models.prisoner import Prisoner


def greedy_assign(prisoners: list[Prisoner]) -> dict[str, list[Prisoner]]:
    assignments: dict[str, list[Prisoner]] = {}
    for prisoner in prisoners:
        assignments.setdefault(prisoner.block, []).append(prisoner)
    return assignments

