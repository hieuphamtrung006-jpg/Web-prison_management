from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_check() -> None:
    response = client.get("/api/v1/readiness")
    payload = response.json()
    assert response.status_code == 200
    assert payload["status"] in {"ready", "degraded"}
    assert payload["environment"] in {"development", "staging", "production"}
    assert isinstance(payload["supabase_configured"], bool)
