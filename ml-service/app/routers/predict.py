import os
import numpy as np
import joblib
import shap
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# ---------------------------------------------------------------------------
# Offender risk model  (loaded lazily)
# ---------------------------------------------------------------------------
_offender_model = None
_offender_explainer = None

OFFENDER_FEATURES = [
    "prior_offenses_count",
    "age_group_encoded",
    "modus_tags_count",
    "days_since_last_offense",
    "co_crime_count",
    "network_size",
]

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models")


def _load_offender_model():
    global _offender_model, _offender_explainer
    if _offender_model is not None:
        return
    path = os.path.join(MODEL_DIR, "offender_gb_v1.pkl")
    if not os.path.exists(path):
        raise RuntimeError(f"Offender model not found at {path}")
    _offender_model = joblib.load(path)
    _offender_explainer = shap.TreeExplainer(_offender_model)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------
class HotspotRequest(BaseModel):
    districtId: int
    daysAhead: int


class Prediction(BaseModel):
    districtId: int
    risk_level: str
    confidence: float


class OffenderRequest(BaseModel):
    features: List[float]
    feature_names: Optional[List[str]] = None


class ShapValue(BaseModel):
    feature: str
    value: float
    shap: float


class OffenderResponse(BaseModel):
    risk_score: float
    shap_values: List[ShapValue]


# ---------------------------------------------------------------------------
# Hotspot prediction (placeholder)
# ---------------------------------------------------------------------------
@router.post("/hotspot", response_model=List[Prediction])
def hotspot(req: HotspotRequest):
    return [
        Prediction(
            districtId=req.districtId,
            risk_level="MEDIUM",
            confidence=0.72,
        )
    ]


# ---------------------------------------------------------------------------
# Offender recidivism risk  (with SHAP explainability)
# ---------------------------------------------------------------------------
@router.post("/offender", response_model=OffenderResponse)
def offender_risk(req: OffenderRequest):
    try:
        _load_offender_model()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    n_features = _offender_model.n_features_in_
    if len(req.features) != n_features:
        raise HTTPException(
            status_code=422,
            detail=f"Expected {n_features} features, got {len(req.features)}",
        )

    feature_names = req.feature_names or OFFENDER_FEATURES[:n_features]
    if len(feature_names) != n_features:
        feature_names = OFFENDER_FEATURES[:n_features]

    X = np.array(req.features, dtype=np.float64).reshape(1, -1)
    risk_score = float(_offender_model.predict(X)[0])

    shap_values = _offender_explainer.shap_values(X)
    values = [
        ShapValue(
            feature=feature_names[i],
            value=float(req.features[i]),
            shap=float(shap_values[0, i]),
        )
        for i in range(n_features)
    ]
    # Sort by absolute SHAP value descending
    values.sort(key=lambda v: abs(v.shap), reverse=True)

    return OffenderResponse(risk_score=risk_score, shap_values=values)
