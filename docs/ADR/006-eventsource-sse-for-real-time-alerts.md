# ADR-006: EventSource SSE for Real-Time Alerts

**Status:** Accepted  
**Date:** 2026-07  

## Context

The dashboard needs real-time push of anomaly alerts to all connected browser clients. Options: WebSocket, Server-Sent Events (SSE), or polling.

## Decision

Use Server-Sent Events (`EventSource`) with Spring's `SseEmitter` on `/api/v1/alerts/stream`. The backend polls Redis Stream (`alerts:stream`, MAXLEN ~500) every 2 seconds and pushes new alerts to connected clients.

## Consequences

- **Positive:** Simpler than WebSocket — unidirectional push is all the dashboard needs. No upgrade handshake.
- **Positive:** Auto-reconnect built into `EventSource` — no reconnection logic needed.
- **Positive:** Redis Stream provides persistence and replay — clients that disconnect and reconnect can catch up.
- **Negative:** Single-threaded polling at 2s interval limits scalability for many concurrent clients.
- **Negative:** SSE does not support custom headers — JWT cannot be passed via `Authorization` header (mitigation: endpoint is `permitAll()` in SecurityConfig).
