from fastapi import APIRouter

from app.models.prisoner import Prisoner

router = APIRouter(prefix="/prisoners", tags=["prisoners"])


@router.get("", response_model=list[Prisoner])
def list_prisoners() -> list[Prisoner]:
    return []

