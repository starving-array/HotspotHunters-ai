import json
import logging
import os
import re
from typing import List, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger("ml_service.nl")

router = APIRouter()

# ── Request / Response models ────────────────────────────────────────────

class NLQuery(BaseModel):
    query: str = Field(..., description="Raw natural language query from officer")

class NLResponse(BaseModel):
    crime_type: Optional[str] = None
    location: Optional[str] = None
    radius_km: Optional[float] = None
    days_back: Optional[int] = None
    raw_text: str

# ── LLM provider configuration ───────────────────────────────────────────

class LLMProviderConfig(BaseModel):
    name: str
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    model: Optional[str] = None

def load_llm_providers() -> List[LLMProviderConfig]:
    raw = os.getenv("LLM_PROVIDERS", "")
    if not raw:
        return []
    result = []
    for name in [p.strip().lower() for p in raw.split(",") if p.strip()]:
        result.append(LLMProviderConfig(
            name=name,
            api_key=os.getenv(f"{name.upper()}_API_KEY"),
            endpoint=os.getenv(f"{name.upper()}_ENDPOINT"),
            model=os.getenv(f"{name.upper()}_MODEL"),
        ))
    return result

# ── System prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a query translation assistant for a police crime database.
Given a natural language query from an officer, extract structured search parameters.
Return ONLY valid JSON with this exact schema:
{
  "crime_type": "theft" | "robbery" | "murder" | "assault" | "cyber crime" | "drug offense" | null,
  "location": "<place name or null>",
  "radius_km": <number or null>,
  "days_back": <number or null>
}
Rules:
- If a field is not mentioned, return null.
- Do NOT include any explanation, only JSON.
- Valid Karnataka districts: Bengaluru Urban, Mysuru, Mangaluru, Hubli, Belagavi, etc.
- Handle word variants: "robberies" → "robbery", "thefts" → "theft", "murders" → "murder", "assaults" → "assault"."""


# ── Regex fallback ────────────────────────────────────────────────────────

def _match_crime(text: str) -> str | None:
    patterns = {
        "robbery":      r"\brobber(?:ies|y)\b",
        "theft":        r"\btheft(?:s)?\b",
        "murder":       r"\bmurder(?:s)?\b",
        "assault":      r"\bassault(?:s)?\b",
        "cyber crime":  r"\bcyber\b",
        "drug offense": r"\bdrug\b",
    }
    for crime, pattern in patterns.items():
        if re.search(pattern, text, re.IGNORECASE):
            return crime
    return None

def regex_fallback(query: str) -> dict:
    text = query.lower()
    crime = _match_crime(query)
    radius = None
    m = re.search(r"(\d+(?:\.\d+)?)\s*km", text)
    if m: radius = float(m.group(1))
    days = None
    m2 = re.search(r"(?:last|past)\s+(\d+)\s+days?", text)
    if m2: days = int(m2.group(1))
    location = None
    m3 = re.search(r"(?:near|in|around)\s+([a-z\s]+?)(?:\s+(?:last|past|in)\s|\s*$)", text)
    if m3: location = m3.group(1).strip().title()
    return {"crime_type": crime, "location": location, "radius_km": radius, "days_back": days}

# ── LLM caller ────────────────────────────────────────────────────────────

def call_llm(provider: LLMProviderConfig, query: str) -> dict:
    if provider.name == "local":
        return regex_fallback(query)

    if provider.name == "ollama":
        endpoint = provider.endpoint or os.getenv("OLLAMA_ENDPOINT", "http://host.docker.internal:11434/v1/chat/completions")
        model = provider.model or os.getenv("OLLAMA_MODEL", "mistral")
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
            "temperature": 0,
            "max_tokens": 500,
            "stream": False,
        }
        headers = {"content-type": "application/json"}

    elif provider.name == "anthropic":
        endpoint = provider.endpoint or "https://api.anthropic.com/v1/messages"
        if not provider.api_key:
            raise ValueError("Anthropic API key not provided")
        payload = {
            "model": provider.model or "claude-3-haiku-20240307",
            "max_tokens": 500,
            "temperature": 0,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": query}],
        }
        headers = {"x-api-key": provider.api_key, "content-type": "application/json"}

    elif provider.name == "groq":
        endpoint = provider.endpoint or "https://api.groq.com/openai/v1/chat/completions"
        if not provider.api_key:
            raise ValueError("Groq API key not provided")
        payload = {
            "model": provider.model or "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
            "temperature": 0,
            "max_tokens": 500,
        }
        headers = {"Authorization": f"Bearer {provider.api_key}", "content-type": "application/json"}

    elif provider.name == "gemini":
        api_key = provider.api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Gemini API key not provided")
        model_name = provider.model or "gemini-1.5-flash"
        endpoint = provider.endpoint or f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": f"{SYSTEM_PROMPT}\n\nQuery: {query}"}]}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 500},
        }
        headers = {"content-type": "application/json", "x-goog-api-key": api_key}

    elif provider.name == "fireworks":
        if not provider.api_key:
            raise ValueError("Fireworks API key not provided")
        endpoint = provider.endpoint or "https://api.fireworks.ai/inference/v1/chat/completions"
        payload = {
            "model": provider.model or "fireworks-ai/fireworks-lite",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
            "temperature": 0,
            "max_tokens": 500,
        }
        headers = {"Authorization": f"Bearer {provider.api_key}", "content-type": "application/json"}

    else:
        raise ValueError(f"Unsupported LLM provider: {provider.name}")

    resp = httpx.post(endpoint, json=payload, headers=headers, timeout=15.0)
    resp.raise_for_status()
    data = resp.json()

    if provider.name == "anthropic":
        content = data.get("content", [{}])[0].get("text", "")
    elif provider.name == "gemini":
        content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    else:
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    if isinstance(content, str):
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if json_match:
            content = json_match.group(1).strip()
        parsed = json.loads(content)
    else:
        parsed = content
    if isinstance(parsed, list):
        parsed = parsed[0] if parsed else {}
    return parsed

# ── Endpoint ──────────────────────────────────────────────────────────────

@router.post("/translate", response_model=NLResponse)
def translate(payload: NLQuery):
    providers = load_llm_providers()
    logger.info(f"NL translate: providers={[p.name for p in providers]}, query={payload.query!r}")

    for provider in providers:
        try:
            parsed = call_llm(provider, payload.query)
            return NLResponse(
                crime_type=parsed.get("crime_type"),
                location=parsed.get("location"),
                radius_km=parsed.get("radius_km"),
                days_back=parsed.get("days_back"),
                raw_text=payload.query,
            )
        except Exception as e:
            logger.warning(f"Provider {provider.name} failed: {e}")
            continue

    logger.info("All providers failed — using regex fallback")
    fallback = regex_fallback(payload.query)
    return NLResponse(
        crime_type=fallback.get("crime_type"),
        location=fallback.get("location"),
        radius_km=fallback.get("radius_km"),
        days_back=fallback.get("days_back"),
        raw_text=payload.query,
    )
