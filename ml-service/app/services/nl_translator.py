"""Re-exported from app.routers.nl for backward compatibility."""
from app.routers.nl import regex_fallback, call_llm, load_llm_providers

def translate_nl(query: str) -> dict:
    providers = load_llm_providers()
    for provider in providers:
        try:
            return call_llm(provider, query)
        except Exception:
            continue
    return regex_fallback(query)
