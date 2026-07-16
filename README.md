# KSP Intelligence Portal

AI-Driven Crime Analytics & Visualization Platform for Karnataka State Police.

**Team:** HotspotHunters | **Engineer:** Archishman Das | **Challenge:** KSP Datathon 2026 — Challenge 2

## Project Overview

The KSP Intelligence Portal transforms fragmented FIR records from 1,100+ police stations across Karnataka into a real-time, queryable intelligence network. It answers three questions for a police officer in real time:

- **Where** are crimes happening right now? (Redis Sorted Set leaderboard + ElasticSearch heatmap)
- **What** will happen next? (Python ML hotspot prediction)
- **Who** is connected to this criminal? (Offender network graph)

## Architecture

The system uses a polyglot microservices architecture:

- **Java Spring Boot** — API gateway, Kafka consumers, security
- **Python FastAPI** — ML predictions, LLM-based natural language query translation
- **Kafka** — Event streaming (30 partitions by district)
- **ElasticSearch** — Geospatial + full-text search
- **Redis** — Real-time leaderboards, caching, rate limiting
- **PostgreSQL** — Transactional source of truth (monthly partitioned)
- **React + Vite** — Dark intelligence dashboard with Leaflet maps

Full architecture document: `KSP_Datathon_2026_Architecture_And_Dev_Plan.md`

## Prerequisites

- **Docker Desktop 4.30+** (with Compose v2)
- **8GB+ RAM** allocated to Docker (the full stack runs 8 containers)
- **Git** (LFS recommended for ML model files — see Phase 4)

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd ksp-intelligence-portal

# 2. Create .env from example
cp .env.example .env
# Edit .env and fill in real values (JWT_SECRET, LLM keys, etc.)

# 3. Start infrastructure services (Phase 0)
cd infra
docker compose up -d

# 4. Wait for all services to be healthy
docker compose ps

# 5. Verify (dev mode with Kibana)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up -d
```

## Service Endpoints (after startup)

| Service | Port | URL | Purpose |
|---|---|---|---|
| PostgreSQL | 5432 | `localhost:5432` | DB (use psql or any client) |
| ElasticSearch | 9200 | http://localhost:9200 | Search engine |
| Redis | 6379 | `localhost:6379` | Cache + leaderboard |
| Kafka | 9092 | `localhost:9092` | Message broker |
| Zookeeper | 2181 | `localhost:2181` | Kafka coordination |
| Kibana (dev) | 5601 | http://localhost:5601 | ES inspection UI |
| Spring Boot API | 8080 | http://localhost:8080 | REST API (Phase 2+) |
| Python ML Service | 8001 | http://localhost:8001 | ML + LLM (Phase 4) |
| React Frontend | 3000 | http://localhost:3000 | Dashboard (Phase 5) |

## Development Phases

| Phase | Version | Goal |
|---|---|---|
| 0 | — | Docker Compose, schema, topics |
| 1 | v0.1.0 | 100K synthetic records, Kafka streaming |
| 2 | v0.2.0 | Kafka consumer groups, Redis leaderboard |
| 3 | v0.3.0 | REST API endpoints, SSE alert stream |
| 4 | v0.4.0 | ML hotspot/offender prediction, LLM NL query |
| 5 | v0.5.0 | React dashboard — map, leaderboard, trends, voice query |
| 6 | v0.6.0 | JWT auth, RBAC, rate limiting, audit trail |
| 7 | v0.7.0 | Prometheus + Grafana observability |
| 8 | v1.0.0 | README, demo video, submission |

## Project Structure

```
ksp-intelligence-portal/
├── api/                  # Spring Boot API (Phase 2+)
├── ml-service/           # Python FastAPI + ML (Phase 4)
├── data-generator/       # Synthetic data (Phase 1)
├── frontend/             # React dashboard (Phase 5)
├── infra/                # Docker Compose + config
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── postgres/init.sql
│   ├── elasticsearch/mappings.json
│   └── kafka/topics.sh
├── docs/                 # Architecture docs + ADRs
├── .env.example          # Placeholder env vars (committed)
└── README.md             # This file
```

## Tech Stack

| Layer | Technology |
|---|---|
| API Gateway | Java 17 + Spring Boot 3.3.x |
| Message Broker | Apache Kafka 7.6.x (Confluent) |
| Search Engine | ElasticSearch 8.14.x |
| Cache | Redis 7.x |
| Database | PostgreSQL 16 |
| ML | Python + scikit-learn + FastAPI |
| LLM | Anthropic Claude / Groq (NL query translation only) |
| Frontend | React 18 + Vite 5 + Leaflet + Recharts + D3 |

See the full architecture document for security, observability, and version control details.

## License

Proprietary — KSP Datathon 2026 submission.
