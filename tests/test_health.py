from fastapi.testclient import TestClient

from api.index import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_works_without_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    response = client.get("/api/health")

    assert response.status_code == 200


def test_unknown_path_returns_json_404_without_internals():
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert "error" in body
    assert "Traceback" not in response.text
