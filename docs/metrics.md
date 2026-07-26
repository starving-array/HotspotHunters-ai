# Observability Metrics

## Spring Boot API (KSP Intelligence)

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `api_requests_total` | Counter | Total number of HTTP requests received by the API. | `uri`, `method`, `status` |
| `api_requests_latency_seconds` | Histogram | Request latency in seconds. | `uri`, `method` |
| `api_ratelimit_exceeded_total` | Counter | Number of requests rejected due to rate‑limit. | `user` |
| `api_audit_events_total` | Counter | Number of audit log events recorded. | `officer` |

The metrics are exposed at **`/actuator/prometheus`**.

## FastAPI ML Service

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `ml_requests_total` | Counter | Total number of ML service HTTP requests. | `endpoint`, `method`, `status` |
| `ml_requests_latency_seconds` | Histogram | Request latency in seconds. | `endpoint`, `method` |

Metrics are available at **`/metrics`**.

## Collection

Both services can be scraped by a Prometheus server. The default scrape interval is 15 s, but can be adjusted in Prometheus configuration.
