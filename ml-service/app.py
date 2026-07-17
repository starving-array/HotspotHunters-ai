import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

app = FastAPI(title="KSP ML Service", version="0.1.0")

class HotspotPredictRequest(BaseModel):
    district_code: str = Field(..., description="District code (e.g., 'D01')")
    taluk_code: Optional[str] = Field(None, description="Taluk code, optional")
    days_back: int = Field(30, ge=1, description="How many days of history to consider")

class HotspotPredictResponse(BaseModel):
    taluk: str
    risk_level: str
    confidence: float
    top_features: List[str]

class OffenderPredictRequest(BaseModel):
    offender_id: str = Field(..., description="Offender identifier")

class OffenderPredictResponse(BaseModel):
    offender_id: str
    recidivism_risk_score: float
    risk_label: str
    shap_reasons: List[str]

class NLTranslateRequest(BaseModel):
    query: str = Field(..., description="Raw natural language query from the officer")

class NLTranslateResponse(BaseModel):
    crime_type: Optional[str]
    location: Optional[str]
    radius_km: Optional[float]
    days_back: Optional[int]
    raw_text: str

# ----- 1. Hotspot prediction -----
@app.post("/predict/hotspot", response_model=HotspotPredictResponse)
def predict_hotspot(req: HotspotPredictRequest):
    # Placeholder deterministic logic – in production replace with ML model.
    # For demo, assign HIGH risk to any district that ends with an odd digit.
    if req.district_code[-1].isdigit() and int(req.district_code[-1]) % 2 == 1:
        risk = "HIGH"
        confidence = 0.92
    else:
        risk = "MEDIUM"
        confidence = 0.78
    return HotspotPredictResponse(
        taluk=req.taluk_code or "unknown",
        risk_level=risk,
        confidence=confidence,
        top_features=["day_of_week", "recent_counts"]
    )

# ----- 2. Offender recidivism prediction -----
@app.post("/predict/offender", response_model=OffenderPredictResponse)
def predict_offender(req: OffenderPredictRequest):
    # Very naive stub – hash the ID to produce a reproducible score.
    score = (sum(ord(c) for c in req.offender_id) % 100) / 100.0
    label = "HIGH" if score > 0.7 else ("MEDIUM" if score > 0.4 else "LOW")
    return OffenderPredictResponse(
        offender_id=req.offender_id,
        recidivism_risk_score=round(score, 3),
        risk_label=label,
        shap_reasons=["prior_offenses", "age_group"]
    )

# ----- 3. Natural language to ElasticSearch translation -----
@app.post("/nl/translate", response_model=NLTranslateResponse)
def nl_translate(req: NLTranslateRequest):
    text = req.query.lower()
    # Very naive keyword extraction – real implementation would call an LLM.
    crime = None
    if "robbery" in text:
        crime = "robbery"
    elif "theft" in text:
        crime = "theft"
    elif "murder" in text:
        crime = "murder"
    # Extract a numeric radius if present (e.g., "5 km")
    radius = None
    import re
    m = re.search(r"(\d+(?:\.\d+)?)\s*km", text)
    if m:
        radius = float(m.group(1))
    # Extract days back if phrased like "last 30 days"
    days = None
    m2 = re.search(r"last\s+(\d+)\s+days?", text)
    if m2:
        days = int(m2.group(1))
    # Location extraction – very naive, expects a word after "near"
    location = None
    m3 = re.search(r"near\s+(\w+)", text)
    if m3:
        location = m3.group(1)
    return NLTranslateResponse(
        crime_type=crime,
        location=location,
        radius_km=radius,
        days_back=days,
        raw_text=req.query
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
