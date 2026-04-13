from fastapi import APIRouter

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("")
def list_incidents() -> list[dict[str, str]]:
    return []

