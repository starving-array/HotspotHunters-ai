import json
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_prometheus_metrics():
    # Send a request to trigger metrics
    payload = {"district_code": "D01", "days_back": 30}
    response = client.post("/predict/hotspot", json=payload)
    assert response.status_code == 200
    # Retrieve metrics
    metrics_resp = client.get("/metrics")
    assert metrics_resp.status_code == 200
    metrics_text = metrics_resp.text
    # Verify that our custom counter is present
    assert "ml_requests_total" in metrics_text
    # Verify that latency histogram is present
    assert "ml_requests_latency_seconds" in metrics_text
