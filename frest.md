# KSP Datathon – Consolidated Implementation Plan

## Overview
The plan merges the **Pre‑Implementation Fixes** (blocking issues, role/security setup, BIT→BOOLEAN conversion) with the **Full Feature Implementation** (schema, Java model, Kafka pipeline, API, ML, Frontend, Security, Observability, Deployment).  Each phase is self‑contained, has explicit exit criteria, and is tagged on Git for traceability.

---

## Phase 0 – Foundation & Blocking Fixes (Day 1)
| Step | Action | File | Success check |
|------|--------|------|---------------|
| 0.1 | Convert all `BIT` columns to `BOOLEAN` (including defaults) | `infra/postgres/init.sql` | `grep -n "BIT" init.sql` returns **0** |
| 0.2 | Add role `ksp_app` and grant minimal privileges (CONNECT, USAGE) | `infra/postgres/init.sql` (top section) | `SELECT rolname FROM pg_roles WHERE rolname='ksp_app';` succeeds |
| 0.3 | Add **CrimeNoSerial** table and `get_next_crime_no` function (SECURITY DEFINER) | `infra/postgres/init.sql` (bottom section) | `\df get_next_crime_no` visible and `SELECT get_next_crime_no(...);` works for `ksp_app` |
| 0.4 | Add missing tables **Inv_OccuranceTime** and **inv_arrestsurrenderaccused** | `infra/postgres/init.sql` | `\dt` lists both tables |
| 0.5 | Fix **ActSectionAssociation** FK types to `VARCHAR` | `infra/postgres/init.sql` | FK columns are `VARCHAR(20)` and reference `Act(ActCode)`, `Section(SectionCode)` |
| 0.6 | Seed IPC/IT/SCST/ARMS sections (including 406, 407, 66C, …) | `infra/postgres/init.sql` | `SELECT COUNT(*) FROM Section;` >= 30 |
| 0.7 | Grant `EXECUTE` on `get_next_crime_no` and appropriate `INSERT/UPDATE` on `CrimeNoSerial` to `ksp_app` | `infra/postgres/init.sql` (security block) | `SELECT has_function_privilege('ksp_app','get_next_crime_no','EXECUTE');` is true |
| 0.8 | Revoke UPDATE/DELETE on `audit_log` from `ksp_app` and PUBLIC | `infra/postgres/init.sql` | `DELETE FROM audit_log WHERE 1=0;` returns **permission denied** |
| 0.9 | Verify DB – eight automated checks (tables, partitions, function, BIT absence, audit permissions, seed counts, role access) | script (see verification block) | All eight checks pass |

**Git**: `git add infra/postgres/init.sql && git commit -m "fix(schema): apply 5 blocking fixes" && git tag -a v0.0.1 -m "Foundation: DB verified"`.

---

## Phase 1 – Data Foundation (Days 2‑3)
| Step | Action | Files | Success check |
|------|--------|-------|---------------|
| 1.1 | Populate synthetic data (100 k CaseMaster rows, related tables) | `data-generator/generate.py` (extended) | `SELECT COUNT(*) FROM CaseMaster;` ≈ 100 000 |
| 1.2 | Bulk index generated cases into Elasticsearch | `data-generator/bulk_index_es.py` | `curl localhost:9200/crime-index/_count` ≈ 95 k |
| 1.3 | Initialise Redis leaderboard (hotspots:live) | `data-generator/init_redis.py` | `redis-cli ZCARD hotspots:live` = 31 |
| 1.4 | Add missing JPA entities for the full schema (CaseMaster, InvOccuranceTime, etc.) and adjust existing ones | `api/src/main/java/com/ksp/intelligence/model/*.java` | `mvn -q compile` succeeds; unit test persists a `CaseMaster`
| 1.5 | Create Spring‑Data repositories for every new entity | `api/src/main/java/com/ksp/intelligence/repository/*.java` | Repository beans load without errors |
| 1.6 | Verify end‑to‑end: Spring Boot starts, can read/write a case record | `api` | `mvn spring-boot:run` starts; API `/api/v1/search/geo` returns results |

**Git**: commit with `feat(data): synthetic data generation` and tag `v0.1.0`.

---

## Phase 2 – Kafka Consumer Pipeline (Days 4‑6)
| Step | Action | Files | Success check |
|------|--------|-------|---------------|
| 2.1 | Add required dependencies to `api/pom.xml` (Kafka, Redis, Elasticsearch, JWT, Micrometer, Lombok, test libs) | `api/pom.xml` | `mvn dependency:tree` shows all listed artifacts |
| 2.2 | Implement **IndexingConsumer** with idempotency (skip duplicate `CrimeNo`) | `api/src/main/java/com/ksp/intelligence/consumer/IndexingConsumer.java` | Duplicate `CrimeNo` is logged and ignored |
| 2.3 | Implement **AggregationConsumer** (already defined) | `api/src/main/java/com/ksp/intelligence/consumer/AggregationConsumer.java` | Aggregations produce correct trend data |
| 2.4 | Implement **AnomalyConsumer** (already defined) | `api/src/main/java/com/ksp/intelligence/consumer/AnomalyConsumer.java` | Anomalies are written to `audit_log` |
| 2.5 | Write Kafka topic creation script and run it | `infra/kafka/topics.sh` | `kafka-topics.sh --list` shows `fir-events`, `alert-events`, `audit-events` |
| 2.6 | Manual consumer test: start API, produce low‑rate events, verify Redis leaderboard and ES count grow | scripts + terminals | Redis ZREVRANGE shows increasing scores; ES `_count` increments |

**Exit criteria** (all satisfied): consumer lag < 10 for each group, Redis ZCARD = 31, ES count ≈ 95 k, no Spring Boot exceptions, Git tag `v0.2.0`.

---

## Phase 3 – REST API Layer (Days 7‑9)
Implement the 14 public endpoints in the order below (controller → service → repository). All endpoints must return a uniform JSON envelope `{status, data}`.

| # | Endpoint | Core logic |
|---|----------|------------|
| 1 | `GET /actuator/health` | Spring Boot health (already works) |
| 2 | `GET /api/v1/hotspots/live` | Read Redis sorted set `hotspots:live` |
| 3 | `GET /api/v1/hotspots/breakdown/{id}` | Redis hash `district:names` + count |
| 4 | `GET /api/v1/alerts/stream` | SSE emitter (see code block in original plan) |
| 5 | `GET /api/v1/search/geo` | ES `geo_bounding_box` query |
| 6 | `GET /api/v1/search/radius` | ES `geo_distance` query |
| 7 | `GET /api/v1/search/fulltext` | ES `match` on `BriefFacts` |
| 8 | `GET /api/v1/trends/{districtId}` | PostgreSQL `GROUP BY month` on `CaseMaster`
| 9 | `GET /api/v1/trends/compare` | Multi‑district trend comparison |
|10 | `GET /api/v1/network/{accusedId}` | PostgreSQL CTE to fetch co‑accused network |
|11 | `POST /api/v1/nl/query` | Forward to Python ML service (`/nl/translate`) |
|12 | `GET /api/v1/predict/hotspot` | Call `/predict/hotspot` on ML service |
|13 | `GET /api/v1/predict/offender/{id}` | Call `/predict/offender` on ML service |
|14 | `POST /api/v1/audit/log` | Insert into `audit_log` (app‑only INSERT) |

**Verification**: each endpoint returns HTTP 200 within documented latency limits (live hotspot < 50 ms, geo search < 200 ms on 100 k records). Git tag `v0.3.0`.

---

## Phase 4 – Python ML + LLM Service (Days 10‑12)
| Step | Action | Files | Success check |
|------|--------|-------|---------------|
| 4.1 | Install requirements, train hotspot RF model & offender GB model | `ml-service/training/*.py` | Models saved under `ml-service/models/` and can be loaded |
| 4.2 | Expose FastAPI endpoints `/predict/hotspot`, `/predict/offender`, `/nl/translate` | `ml-service/app/main.py` | `curl` calls return JSON with confidence scores / SHAP explanations |
| 4.3 | Cache LLM responses in Redis (TTL 300 s) | FastAPI code | Second call is < 50 ms and log shows cache hit |

Git tag `v0.4.0`.

---

## Phase 5 – React Frontend (Days 13‑16)
Build panels in the order that maximises demo impact.

1. **Login** – JWT authentication flow.
2. **MapPanel** – Leaflet map with Karnataka GeoJSON, crime markers from `/api/v1/search/geo`.
3. **LeaderboardPanel** – SSE from `/api/v1/hotspots/live`.
4. **QueryPanel** – Text input + Web Speech API, calls `/api/v1/nl/query`.
5. **TrendPanel** – Recharts line charts using `/api/v1/trends/{districtId}`.
6. **PredictPanel** – Heatmap overlay from `/api/v1/predict/hotspot`.
7. **NetworkGraph** – D3 force‑directed co‑accused graph via `/api/v1/network/{accusedId}`.
8. **AlertTicker** – SSE live feed from `/api/v1/alerts/stream`.

All panels must display real data from the backend. Git tag `v0.5.0`.

---

## Phase 6 – Security Hardening (Days 17‑19)
Implement in this order (each as a separate commit):
1. **JWT filter chain** (`JwtAuthFilter.java`).
2. **JwtTokenProvider** (issue, validate, blacklist).
3. **Refresh‑token rotation** (HttpOnly cookie).
4. **Rate‑limit filter** (Redis token bucket, 100 req/min for ANALYST).
5. **District‑scope enforcement** on all data‑access queries.
6. **AuditInterceptor** – log every request to `audit_log`.
7. **Security‑headers filter** (CSP, HSTS, X‑Frame‑Options).
8. **CORS configuration** (restricted to frontend origin).

**Exit criteria**: unauthenticated → 401, role‑based → 403, rate‑limit triggers, every API call appears in `audit_log`. Git tag `v0.6.0`.

---

## Phase 7 – Observability & Docker Polish (Days 20‑21)
| Item | Detail |
|------|--------|
| Prometheus metrics | Custom meters for Kafka lag, Redis ops, ES latency, LLM cache hit rate |
| Grafana dashboard | Import ready JSON, expose at `localhost:3001` |
| Structured logging | Logback JSON layout, include request‑ID, user‑ID |
| Fresh‑clone test | Clone repo, run `docker compose up -d`, execute `python ksp_audit.py`; target score > 90 % |

Git tag `v0.7.0`.

---

## Phase 8 – Catalyst Deployment & Submission (Days 22‑25)
1. Claim Zoho Catalyst credits, install CLI, login.
2. Build Docker images and push to Catalyst (follow `CATALYST_DEPLOYMENT_GUIDE.md`).
3. Deploy services in order: Elasticsearch → PostgreSQL → Redis → ML FastAPI → Spring Boot API → React frontend.
4. Configure API Gateway routing.
5. Prepare submission artifacts (PPT, demo video, `ksp_audit.py` run against public URL).
6. Verify repo is public, Catalyst URL returns **200**, tag `v1.0.0` and push.

---

## Consolidated Milestone Table
| Phase | Tag | Days | Key Deliverable |
|------|-----|------|-----------------|
| 0 | v0.0.1 | 1 | DB schema verified, BIT→BOOLEAN, roles, permissions |
| 1 | v0.1.0 | 2‑3 | 100 k synthetic cases + ES + Redis populated |
| 2 | v0.2.0 | 4‑6 | Kafka consumers running, idempotent, low lag |
| 3 | v0.3.0 | 7‑9 | All 14 REST endpoints live |
| 4 | v0.4.0 |10‑12| ML & LLM FastAPI service operational |
| 5 | v0.5.0 |13‑16| Full React dashboard with live data |
| 6 | v0.6.0 |17‑19| Security (JWT, RBAC, audit, rate‑limit) |
| 7 | v0.7.0 |20‑21| Observability (Prometheus, Grafana, logging) |
| 8 | v1.0.0 |22‑25| Catalyst deployment, audit > 90 %, submission |

---

**How to use this plan**
- Follow the steps in order. Each step ends with a Git commit and tag; the repository history will show progress.
- Run the verification commands listed in Phase 0 before moving forward.
- If any verification fails, fix the issue **before** the next commit.
- All new libraries must be pre‑approved (see tech stack); otherwise ask first.

*End of consolidated implementation plan.*