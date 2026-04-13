import pytest

from app.core.config import Settings


def test_production_requires_supabase_secrets() -> None:
    with pytest.raises(ValueError):
        Settings(environment="production", supabase_url="", supabase_service_role_key="")

