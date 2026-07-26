# ADR-005: Vite Dev Server with Proxy Over Nginx Static Serve

**Status:** Accepted  
**Date:** 2026-07  

## Context

The frontend Docker container needs to serve the React SPA and route API calls to the Spring Boot backend. Options: build static files and serve via nginx, or run Vite dev server with its built-in proxy.

## Decision

Run Vite dev server (`vite --host 0.0.0.0 --port 5173`) in the Docker container, using Vite's proxy middleware to forward `/api/*` requests to `spring-boot-api:8080`.

## Consequences

- **Positive:** Hot module replacement works inside Docker for fast development iteration.
- **Positive:** Vite proxy eliminates CORS issues during development — backend sees requests originating from itself.
- **Positive:** No separate build step needed — code changes are reflected immediately.
- **Negative:** Larger container image (includes `node_modules` and source).
- **Negative:** Not suitable for production — would switch to nginx+dist for deployment.
