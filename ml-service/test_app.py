import sys
sys.path.insert(0, ".")
sys.path.insert(0, "app")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_predict_hotspot():
    resp = client.post("/predict/hotspot", json={"districtId": 2, "daysAhead": 7})
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert "risk_level" in data[0]
    assert "confidence" in data[0]

def test_predict_offender():
    resp = client.post("/predict/offender", json={"features": [1, 2, 0, 30, 0, 3]})
    assert resp.status_code == 200
    data = resp.json()
    assert "risk_score" in data
    assert "shap_values" in data

def test_nl_translate():
    query = "Show me robbery cases near Yelahanka in the last 30 days"
    resp = client.post("/nl/translate", json={"query": query})
    assert resp.status_code == 200
    data = resp.json()
    assert data["raw_text"] == query
