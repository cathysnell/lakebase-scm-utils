"""Basic application tests."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    # serve_id identifies which project this backend is (so the deploy poll + client e2e can
    # refuse a foreign backend on a shared port); always present, echoing CONSORT_SERVE_ID or
    # the project name.
    assert "serve_id" in body
