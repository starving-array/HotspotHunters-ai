# Phase 5 – React Dashboard

Implemented the full front‑end UI for the KSP Intelligence Portal:
- Vite + React (TypeScript) scaffold with dark theme.
- Sidebar components:
  - Keyword search.
  - Natural‑language query (NL) translation.
  - Hotspot risk and offender recidivism prediction panels.
  - Live hotspot leaderboard.
  - Live alerts SSE feed.
- Main area map (Leaflet) showing recent FIR markers.
- Backend proxy controllers for NL translation and ML predictions.
- Configurable ML service URL and dynamic LLM provider handling.
- Proxy configuration for API calls.

All components are functional and integrated with the Spring Boot API and the FastAPI ML service.
