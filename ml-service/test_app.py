from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_predict_hotspot():
    resp = client.post("/predict/hotspot", json={"district_code": "D01", "taluk_code": "T01", "days_back": 30})
    assert resp.status_code == 200
    data = resp.json()
    assert "risk_level" in data
    assert "confidence" in data

def test_predict_offender():
    resp = client.post("/predict/offender", json={"offender_id": "O123"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["offender_id"] == "O123"
    assert "recidivism_risk_score" in data

def test_nl_translate():
    query = "Show me robbery cases near Yelahanka in the last 30 days"
    resp = client.post("/nl/translate", json={"query": query})
    assert resp.status_code == 200
    data = resp.json()
    assert data["crime_type"] == "robbery"
    assert data["location"] == "yelahanka"
    assert data["days_back"] == 30
