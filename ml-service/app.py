import uvicorn
import os
import re
import logging
from typing import List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Optional: load .env for local dev
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

app = FastAPI(title="KSP ML Service", version="0.1.0")

logger = logging.getLogger("ml_service")
logger.setLevel(logging.INFO)

# ------------------- Configuration -------------------
class LLMProviderConfig(BaseModel):
    name: str
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    model: Optional[str] = None  # model identifier for the provider
    # For offline/local models (e.g., HuggingFace) we can store a path
    local_path: Optional[str] = None

def load_llm_providers() -> List[LLMProviderConfig]:
    """Read providers from env var ``LLM_PROVIDERS`` which is a comma‑separated list.
    For each provider name (e.g., ``anthropic``, ``groq``, ``local``) we look up additional
    environment variables:

    * ``{NAME}_API_KEY`` – API key for the provider
    * ``{NAME}_ENDPOINT`` – optional custom endpoint URL (defaults are hard‑coded)
    * ``{NAME}_MODEL`` – model identifier to request (e.g., ``claude-3-haiku-20240307``)
    * ``{NAME}_LOCAL_PATH`` – for ``local`` provider, path to a HuggingFace model.
    """
    providers_raw = os.getenv("LLM_PROVIDERS", "")
    if not providers_raw:
        logger.warning("LLM_PROVIDERS env var not set – NL translation will fall back to regex parser")
        return []
    result = []
    for name in [p.strip().lower() for p in providers_raw.split(',') if p.strip()]:
        cfg = LLMProviderConfig(
            name=name,
            api_key=os.getenv(f"{name.upper()}_API_KEY"),
            endpoint=os.getenv(f"{name.upper()}_ENDPOINT"),
            model=os.getenv(f"{name.upper()}_MODEL"),
            local_path=os.getenv(f"{name.upper()}_LOCAL_PATH"),
        )
        result.append(cfg)
    return result

llm_providers = load_llm_providers()

# ------------------- Helper: LLM call -------------------
def call_llm(provider: LLMProviderConfig, user_query: str) -> dict:
    """Send *user_query* to the specified LLM provider and return a parsed JSON dict.
    The function expects the LLM to respond with a JSON object matching ``NLTranslateResponse``.
    If the call fails (network error, auth error, parsing error) an exception is raised
    so the caller can try the next provider.
    """
    if provider.name == "local":
        # Very lightweight offline fallback – use a simple regex parser (same as current stub).
        logger.info("Using local regex fallback for LLM translation")
        # Reuse the existing regex logic (duplicate to keep it self‑contained).
        text = user_query.lower()
        crime = None
        if "robbery" in text:
            crime = "robbery"
        elif "theft" in text:
            crime = "theft"
        elif "murder" in text:
            crime = "murder"
        radius = None
        m = re.search(r"(\d+(?:\.\d+)?)\s*km", text)
        if m:
            radius = float(m.group(1))
        days = None
        m2 = re.search(r"last\s+(\d+)\s+days?", text)
        if m2:
            days = int(m2.group(1))
        location = None
        m3 = re.search(r"near\s+(\w+)", text)
        if m3:
            location = m3.group(1)
        return {
            "crime_type": crime,
            "location": location,
            "radius_km": radius,
            "days_back": days,
            "raw_text": user_query,
        }
    # Remote providers – currently support Anthropic and Groq (both use HTTP POST JSON).
    if provider.name == "anthropic":
        endpoint = provider.endpoint or "https://api.anthropic.com/v1/messages"
        if not provider.api_key:
            raise ValueError("Anthropic API key not provided")
        payload = {
            "model": provider.model or "claude-3-haiku-20240307",
            "max_tokens": 500,
            "temperature": 0,
            "messages": [{"role": "user", "content": f"Extract structured JSON from this query: {user_query}"}],
        }
        headers = {"x-api-key": provider.api_key, "content-type": "application/json"}
    elif provider.name == "groq":
        endpoint = provider.endpoint or "https://api.groq.com/openai/v1/chat/completions"
        if not provider.api_key:
            raise ValueError("Groq API key not provided")
        payload = {
            "model": provider.model or "llama3-8b-8192",
            "messages": [{"role": "user", "content": f"Extract structured JSON from this query: {user_query}"}],
            "temperature": 0,
            "max_tokens": 500,
        }
        headers = {"Authorization": f"Bearer {provider.api_key}", "content-type": "application/json"}
    else:
        raise ValueError(f"Unsupported LLM provider: {provider.name}")

    try:
        resp = httpx.post(endpoint, json=payload, headers=headers, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
        # For Anthropic, the content is in resp["content"][0]["text"]
        if provider.name == "anthropic":
            content = data.get("content", [{}])[0].get("text", "")
        else:  # groq returns choices[0].message.content
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        # Attempt to parse JSON from the returned text.
        try:
            parsed = httpx.JSONDecoder().decode(content) if isinstance(content, str) else content
        except Exception as e:
            # Often the model returns raw JSON string – try eval safely via json.loads.
            import json
            parsed = json.loads(content)
        return parsed
    except Exception as exc:
        logger.error(f"LLM call failed for provider {provider.name}: {exc}")
        raise

# ------------------- Data models (unchanged) -------------------
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
        top_features=["day_of_week", "recent_counts"],
    )

# ----- 2. Offender recidivism prediction -----
@app.post("/predict/offender", response_model=OffenderPredictResponse)
def predict_offender(req: OffenderPredictRequest):
    score = (sum(ord(c) for c in req.offender_id) % 100) / 100.0
    label = "HIGH" if score > 0.7 else ("MEDIUM" if score > 0.4 else "LOW")
    return OffenderPredictResponse(
        offender_id=req.offender_id,
        recidivism_risk_score=round(score, 3),
        risk_label=label,
        shap_reasons=["prior_offenses", "age_group"],
    )

# ----- 3. Natural language to ElasticSearch translation -----
@app.post("/nl/translate", response_model=NLTranslateResponse)
def nl_translate(req: NLTranslateRequest):
    # Try each configured provider in order; fallback to local regex if none succeed.
    for provider in llm_providers:
        try:
            parsed = call_llm(provider, req.query)
            # Ensure required keys exist – missing keys will be filled with None later.
            return NLTranslateResponse(
                crime_type=parsed.get("crime_type"),
                location=parsed.get("location"),
                radius_km=parsed.get("radius_km"),
                days_back=parsed.get("days_back"),
                raw_text=req.query,
            )
        except Exception:
            # Log already happened inside call_llm; try next provider.
            continue
    # If we get here, no LLM succeeded – use the simple regex fallback.
    logger.info("All LLM providers failed – using built‑in regex parser")
    text = req.query.lower()
    crime = None
    if "robbery" in text:
        crime = "robbery"
    elif "theft" in text:
        crime = "theft"
    elif "murder" in text:
        crime = "murder"
    radius = None
    m = re.search(r"(\d+(?:\.\d+)?)\s*km", text)
    if m:
        radius = float(m.group(1))
    days = None
    m2 = re.search(r"last\s+(\d+)\s+days?", text)
    if m2:
        days = int(m2.group(1))
    location = None
    m3 = re.search(r"near\s+(\w+)", text)
    if m3:
        location = m3.group(1)
    return NLTranslateResponse(
        crime_type=crime,
        location=location,
        radius_km=radius,
        days_back=days,
        raw_text=req.query,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
