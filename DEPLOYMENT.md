# KSP Intelligence Portal — Catalyst Deployment Guide

| | |
|---|---|
| **Target Platform** | Zoho Catalyst (AppSail + Data Store + Cache + Signals) |
| **Version** | 1.0.0 |
| **Last Updated** | July 2026 |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Adaptation for Catalyst](#2-architecture-adaptation-for-catalyst)
3. [Prerequisites](#3-prerequisites)
4. [Environment Configuration](#4-environment-configuration)
5. [Deployment Order & Dependency Graph](#5-deployment-order--dependency-graph)
6. [Step 1: Provision Managed Services](#6-step-1-provision-managed-services)
7. [Step 2: Database Schema Setup](#7-step-2-database-schema-setup)
8. [Step 3: Deploy Spring Boot API](#8-step-3-deploy-spring-boot-api)
9. [Step 4: Deploy Python ML Service](#9-step-4-deploy-python-ml-service)
10. [Step 5: Deploy React Frontend](#10-step-5-deploy-react-frontend)
11. [Step 6: Data Seeding](#11-step-6-data-seeding)
12. [Step 7: Wire Services Together](#12-step-7-wire-services-together)
13. [Post-Deployment Configuration](#13-post-deployment-configuration)
14. [Monitoring & Logs](#14-monitoring--logs)
15. [Scaling](#15-scaling)
16. [Backup & Disaster Recovery](#16-backup--disaster-recovery)
17. [Troubleshooting](#17-troubleshooting)
18. [Required Code Modifications Summary](#18-required-code-modifications-summary)
19. [Appendix A: Catalyst CLI Cheat Sheet](#19-appendix-a-catalyst-cli-cheat-sheet)
20. [Appendix B: Environment Variables Master Table](#20-appendix-b-environment-variables-master-table)
21. [Appendix C: Cost Estimation](#21-appendix-c-cost-estimation)

---

## 1. Overview

**KSP Intelligence Portal** is a distributed intelligence platform for the Karnataka State Police. It transforms crime data into real-time, explainable, geospatial insights.

This guide covers deploying the system on **Zoho Catalyst** — a full-stack serverless cloud platform. The deployment uses:

| Catalyst Service | Maps To | Purpose |
|-----------------|---------|---------|
| **AppSail** (Custom Runtime) | Spring Boot API | REST API + Kafka consumer replacement |
| **AppSail** (Custom Runtime) | Python ML Service | ML predictions + NL query translation |
| **AppSail** (Node.js) / **Slate** | React Frontend | Web UI for officers |
| **Data Store** | PostgreSQL | Primary database + full-text search |
| **Cache** | Redis | Real-time leaderboard + rate limiting |
| **Signals** | Kafka (replacement) | Event bus for FIR processing pipeline |

### Simplified Architecture (Catalyst-adapted)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  React UI   │────▶│ Spring Boot  │────▶│ PostgreSQL       │
│  (AppSail)  │     │ API (AppSail)│     │ (Data Store)     │
└─────────────┘     │              │     │ + full-text idx  │
                    │              │────▶│ Cache (Redis)    │
                    │              │     └──────────────────┘
                    │              │────▶│ Signals (Events) │
                    │     │        │     └──────────────────┘
                    │     ▼        │
                    │  ML Service  │
                    │  (AppSail)   │
                    └──────────────┘
```

---

## 2. Architecture Adaptation for Catalyst

The original system uses Kafka, ElasticSearch, Redis, and Neo4j. Catalyst does not offer managed equivalents for Kafka, ElasticSearch, or Neo4j. The following adaptations are required:

### 2.1 Kafka → Catalyst Signals

**Original:** Three Kafka consumer groups (indexing, aggregation, anomaly) consume `fir-events` topic in parallel.

**Adaptation:** Replace Kafka with Catalyst **Signals** (event bus service). The Spring Boot API publishes FIR events to a Signals topic; consumers are implemented as HTTP endpoints or Signals event handlers.

- Signals provides at-least-once delivery similar to Kafka
- Topics replace Kafka topics
- Event handlers replace `@KafkaListener` annotations
- See [Section 18](#18-required-code-modifications-summary) for code changes

> **Fallback option:** If Signals does not meet throughput needs, deploy Kafka as an AppSail container. However, AppSail is designed for HTTP services and long-running infrastructure containers may have stability issues.

### 2.2 ElasticSearch → PostgreSQL Full-Text Search

**Original:** ElasticSearch geo_distance and full-text queries on crime records.

**Adaptation:** Replace ES with PostgreSQL's built-in full-text search using `tsvector`/`tsquery`:

- Add a `search_vector` column to `fir_records`
- Create a GIN index for fast search
- Replace ES DSL queries with PostgreSQL `@@` operator and `ts_rank()`
- Geo queries use standard `latitude`/`longitude` columns with `earthdistance` or `pg_trgm` extensions
- See [Section 7.2](#72-add-full-text-search-support) for the SQL migration

### 2.3 Redis → Catalyst Cache

**Original:** Redis for hotspot leaderboard (Sorted Set), rate limiting, and session management.

**Adaptation:** Catalyst **Cache** is Redis-compatible. Minimal code changes needed — only the connection endpoint changes.

### 2.4 Neo4j → Disabled

**Original:** Neo4j for crime network graph analysis.

**Adaptation:** Graph features (network graph page, link prediction) are **disabled** on Catalyst. The NetworkGraph page in the frontend will show an appropriate "not available" message. The `offender_network` table in PostgreSQL still captures co-crime relationships for basic queries.

### 2.5 Prometheus/Grafana → Not Deployed

**Original:** Prometheus for metrics collection, Grafana for dashboards.

**Adaptation:** Rely on Catalyst's built-in monitoring and logging. The API still exposes metrics at `/actuator/prometheus` but no Prometheus target scrapes them.

---

## 3. Prerequisites

### 3.1 Accounts & Tools

| Requirement | Version/Details |
|-------------|----------------|
| Zoho Catalyst Account | Sign up at https://catalyst.zoho.com (free tier: $250 credits) |
| Node.js | v20.x or later |
| npm | v9.x or later |
| Catalyst CLI | `npm install -g zcatalyst-cli` |
| Docker Desktop | For local image building |
| Git | For cloning the repository |

### 3.2 Catalyst CLI Setup

```bash
# Install CLI
npm install -g zcatalyst-cli

# Verify installation
catalyst --version

# Login (opens browser for OAuth)
catalyst login
```

After login, verify with:
```bash
catalyst project:list
```

### 3.3 Clone the Repository

```bash
git clone https://github.com/ArchishmanDas/hotspothunters-ai.git
cd hotspothunters-ai
```

---

## 4. Environment Configuration

### 4.1 Create a Catalyst Project

Before deploying, create a project in the Catalyst Console (https://console.catalyst.zoho.com):

1. Click **New Project**
2. Enter name: `KSP Intelligence Portal`
3. Choose a data center (recommend India for low latency)
4. Click **Create**

Note the **Project ID** from the URL or project settings.

### 4.2 Environment Variables on Catalyst

Environment variables are set per AppSail service in the Catalyst Console under **AppSail → Configurations → Environment Variables**.

Master variable table with Catalyst-specific values:

| Variable | Value (Example) | Service | Notes |
|----------|----------------|---------|-------|
| `POSTGRES_URL` | `jdbc:postgresql://<data-store-host>:5432/ksp_intelligence` | API | From Data Store connection details |
| `POSTGRES_DB` | `ksp_intelligence` | API | |
| `POSTGRES_USER` | `ksp_app` | API | Created in Data Store |
| `POSTGRES_PASSWORD` | (your password) | API | Set in Data Store |
| `REDIS_HOST` | `<cache-host>` | API, ML | From Cache connection details |
| `REDIS_PORT` | `6379` | API, ML | |
| `REDIS_PASSWORD` | (your password) | API, ML | Set in Cache service |
| `SIGNALS_PROJECT_ID` | `<project-id>` | API | From Catalyst Console |
| `SIGNALS_TOPIC_FIR` | `fir-events` | API | |
| `SIGNALS_TOPIC_ALERT` | `alert-events` | API | |
| `SIGNALS_TOPIC_AUDIT` | `audit-events` | API | |
| `JWT_SECRET` | (generate: `openssl rand -base64 32`) | API | Min 256-bit |
| `JWT_ACCESS_EXPIRY_MINUTES` | `15` | API | |
| `JWT_REFRESH_EXPIRY_HOURS` | `24` | API | |
| `ML_SERVICE_URL` | `https://<ml-appsail-url>.development.catalystserverless.com` | API | From deployed ML AppSail |
| `ANTHROPIC_API_KEY` | (your key) | API, ML | Optional for LLM |
| `GROQ_API_KEY` | (your key) | API, ML | Optional fallback |
| `LLM_PROVIDERS` | `local` | ML | Use regex fallback if no API key |
| `OLLAMA_ENDPOINT` | — | ML | Not needed on Catalyst |
| `FRONTEND_URL` | `https://<frontend-appsail-url>.development.catalystserverless.com` | API | CORS origin |
| `RATE_LIMIT_ANALYST` | `100` | API | |
| `RATE_LIMIT_SUPERVISOR` | `200` | API | |
| `RATE_LIMIT_ADMIN` | `500` | API | |
| `RATE_LIMIT_NL_QUERY` | `10` | API | |
| `SERVER_PORT` | `9000` | API | Must match `X_ZOHO_CATALYST_LISTEN_PORT` |
| `X_ZOHO_CATALYST_LISTEN_PORT` | `9000` | API, ML | Set automatically by Catalyst |
| `SPRING_PROFILES_ACTIVE` | `prod` | API | |

### 4.3 Generate JWT Secret

```bash
# Generate a secure random secret
openssl rand -base64 32
# Output example: 7Xq3pZ9mK2wR5vB8nC1fH4jL6oP0sT3u
```

Use this value for `JWT_SECRET`.

---

## 5. Deployment Order & Dependency Graph

Deploy in this exact order — each step depends on the previous one.

```
Step 1: Data Store (PostgreSQL) + Cache (Redis) + Signals
        └── No dependencies
Step 2: Database Schema Setup
        └── Depends on: Data Store
Step 3: ML Service (AppSail)
        └── No dependencies on other AppSail services
Step 4: Spring Boot API (AppSail)
        └── Depends on: Data Store, Cache, Signals, ML Service
Step 5: React Frontend (AppSail)
        └── Depends on: Spring Boot API URL
Step 6: Data Seeding
        └── Depends on: Data Store (schema ready), Cache, Signals
```

---

## 6. Step 1: Provision Managed Services

### 6.1 Data Store (PostgreSQL)

Provision via Catalyst Console:

1. Navigate to **Data Store** → **Create Table** (or use the PostgreSQL interface)
2. Choose **PostgreSQL** type
3. Configure:
   - **Name:** `ksp-intelligence-db`
   - **Username:** `ksp_app`
   - **Password:** Generate a strong password
   - **Region:** Same as project
   - **Plan:** Start with the free tier (100 MB)
4. Click **Create**

After creation, note the **Connection URL** (format: `jdbc:postgresql://<host>:5432/ksp_intelligence`). You'll need this for the API configuration and schema setup.

### 6.2 Cache (Redis)

1. Navigate to **Cache** → **Create Cache**
2. Configure:
   - **Name:** `ksp-cache`
   - **Memory:** 256 MB (minimum)
   - **Eviction Policy:** `allkeys-lru`
3. Click **Create**

Note the **Host** and **Port** from the connection details.

### 6.3 Signals (Event Bus)

1. Navigate to **Signals** → **Create Topic**
2. Create three topics:

| Topic Name | Description | Partitions |
|-----------|-------------|-----------|
| `fir-events` | FIR record created events | 3 |
| `alert-events` | Anomaly/spike alerts | 1 |
| `audit-events` | Audit trail events | 1 |

3. Note the **Signals Project ID** and **Topic IDs** from the console.

---

## 7. Step 2: Database Schema Setup

### 7.1 Connect to Data Store

Use `psql` or any PostgreSQL client to connect:

```bash
psql "jdbc:postgresql://<host>:5432/ksp_intelligence" -U ksp_app -W
```

### 7.2 Create Schema

Run the core schema from `infra/postgres/init.sql`. **Skip the role creation sections** (Data Store manages users):

```bash
# Download the init.sql from the repo
# Remove or comment out lines 14-25 (role setup) and lines 739-750 (readonly role)
psql -h <host> -U ksp_app -d ksp_intelligence -f infra/postgres/init.sql
```

### 7.3 Add Full-Text Search Support

After loading the schema, add the full-text search column and index to replace ElasticSearch:

```sql
-- Add search_vector column for full-text search
ALTER TABLE fir_records ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate search_vector from existing data (and create trigger for new data)
CREATE OR REPLACE FUNCTION fir_records_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.crime_type, '') || ' ' ||
        COALESCE(NEW.crime_subtype, '') || ' ' ||
        COALESCE(NEW.modus_operandi, '') || ' ' ||
        COALESCE(NEW.fir_id, '') || ' ' ||
        COALESCE(NEW.station_code, '') || ' ' ||
        COALESCE(NEW.district_code, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update on insert or update
CREATE TRIGGER trg_fir_records_search
    BEFORE INSERT OR UPDATE ON fir_records
    FOR EACH ROW EXECUTE FUNCTION fir_records_search_update();

-- Update existing rows
UPDATE fir_records SET search_vector = to_tsvector('english',
    COALESCE(crime_type, '') || ' ' ||
    COALESCE(crime_subtype, '') || ' ' ||
    COALESCE(modus_operandi, '') || ' ' ||
    COALESCE(fir_id, '') || ' ' ||
    COALESCE(station_code, '') || ' ' ||
    COALESCE(district_code, '')
);

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_fir_records_search ON fir_records USING GIN(search_vector);
```

### 7.4 Add Geo Search Support

PostgreSQL can handle geo queries using the `earthdistance` and `cube` extensions:

```sql
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Index for geo distance queries
CREATE INDEX IF NOT EXISTS idx_fir_geo ON fir_records(latitude, longitude);
```

Example geo search query (replaces ElasticSearch `geo_distance`):

```sql
-- Find FIRs within 10km of a point
SELECT *, earth_distance(
    ll_to_earth(latitude::float8, longitude::float8),
    ll_to_earth(12.9716, 77.5946)
) AS distance_meters
FROM fir_records
WHERE earth_distance(
    ll_to_earth(latitude::float8, longitude::float8),
    ll_to_earth(12.9716, 77.5946)
) <= 10000  -- 10km in meters
ORDER BY distance_meters
LIMIT 20;
```

### 7.5 Run Migrations

Run any additional migration scripts from `infra/postgres/migrations/` (if applicable) in numerical order.

---

## 8. Step 3: Deploy Spring Boot API

### 8.1 Prerequisites

Before deploying, the API code needs modifications for Catalyst compatibility (see [Section 18](#18-required-code-modifications-summary)). The key changes are:
1. Replace Kafka consumers with Signals event handlers
2. Replace ElasticSearch operations with PostgreSQL full-text search
3. Add `server.port` env var support (listen on `X_ZOHO_CATALYST_LISTEN_PORT`)
4. Disable ES health check

### 8.2 Build the Docker Image

The API uses a multi-stage Docker build. Build for the correct platform (Catalyst requires `linux/amd64`):

```bash
cd api

# Build the JAR (skip tests for speed; tests were run in CI)
mvn clean package -DskipTests

# Build the Docker image for linux/amd64
docker build --platform linux/amd64 -t ksp-api:latest .
```

> **⚠️ Important:** If building on an Apple Silicon (M1/M2/M3) machine, the `--platform linux/amd64` flag is mandatory. Catalyst servers run on x86-64 architecture.

### 8.3 Modify Dockerfile for Catalyst

Create a file `api/Dockerfile.catalyst` with these changes:

```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml /build/pom.xml
RUN mvn -B -q dependency:go-offline
COPY src /build/src
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=builder /build/target/*-SNAPSHOT.jar /app/app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

# Catalyst listens on port 9000 by default
EXPOSE 9000

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar --server.port=${X_ZOHO_CATALYST_LISTEN_PORT:-9000}"]
```

Build with:
```bash
docker build --platform linux/amd64 -t ksp-api:latest -f Dockerfile.catalyst .
```

### 8.4 Save and Deploy

```bash
# Save the Docker image to a tar file
docker save ksp-api:latest -o ksp-api.tar

# Initialize AppSail service (interactive — first time only)
catalyst appsail:add --name ksp-api

# Or deploy standalone (non-interactive)
catalyst deploy appsail \
  --name ksp-api \
  --source docker-archive://./ksp-api.tar \
  --port 9000

# Clean up
rm ksp-api.tar
```

**Alternative: Deploy via Catalyst Console:**
1. Push the image to Docker Hub: `docker tag ksp-api:latest youruser/ksp-api:latest && docker push youruser/ksp-api:latest`
2. In Catalyst Console → AppSail → **Create Service**
3. Choose **Custom Runtime → Docker Hub**
4. Enter image: `youruser/ksp-api:latest`
5. Set port: `9000`
6. Add environment variables from [Section 4.2](#42-environment-variables-on-catalyst)
7. Click **Deploy**

### 8.5 Configure Environment Variables

In the Catalyst Console for the `ksp-api` AppSail service, set these environment variables:

| Variable | Source |
|----------|--------|
| `POSTGRES_URL` | Data Store connection string |
| `POSTGRES_USER` | Data Store username |
| `POSTGRES_PASSWORD` | Data Store password |
| `REDIS_HOST` | Cache host |
| `REDIS_PORT` | Cache port (usually 6379) |
| `REDIS_PASSWORD` | Cache password |
| `JWT_SECRET` | Generated secret |
| `JWT_ACCESS_EXPIRY_MINUTES` | 15 |
| `JWT_REFRESH_EXPIRY_HOURS` | 24 |
| `ML_SERVICE_URL` | From ML AppSail service URL |
| `SPRING_PROFILES_ACTIVE` | prod |
| `FRONTEND_URL` | From Frontend AppSail service URL |

> **Note:** The ELK (ElasticSearch) and Kafka env vars are no longer needed since those services are replaced.

### 8.6 Health Check

After deployment, verify:
```bash
# Wait for service to start (~2-3 minutes for first deploy)
catalyst appsail:logs --name ksp-api

# Check health
curl https://ksp-api-<project-id>.development.catalystserverless.com/actuator/health
```

Expected response:
```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "redis": { "status": "UP" },
    "ping": { "status": "UP" }
  }
}
```

Note: ElasticSearch health check will be DOWN (since ES is replaced). Either:
- Disable ES health check: `management.health.elasticsearch.enabled=false`
- Or ignore the DOWN status (non-critical)

---

## 9. Step 4: Deploy Python ML Service

### 9.1 Modify Dockerfile for Catalyst

Create `ml-service/Dockerfile.catalyst`:

```dockerfile
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11

COPY . /app
WORKDIR /app
RUN pip install --no-cache-dir -r requirements.txt

ENV MODULE_NAME=app.main
ENV APP_MODULE=app.main:app

# Catalyst listens on 9000
ENV PORT=9000
EXPOSE 9000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
```

### 9.2 Build and Deploy

```bash
cd ml-service

docker build --platform linux/amd64 -t ksp-ml:latest -f Dockerfile.catalyst .
docker save ksp-ml:latest -o ksp-ml.tar

catalyst deploy appsail \
  --name ksp-ml \
  --source docker-archive://./ksp-ml.tar \
  --port 9000

rm ksp-ml.tar
```

### 9.3 Configure Environment Variables

Set these in the Catalyst Console for `ksp-ml`:

| Variable | Value |
|----------|-------|
| `REDIS_HOST` | Cache host |
| `REDIS_PORT` | 6379 |
| `REDIS_PASSWORD` | Cache password |
| `LLM_PROVIDERS` | `local` (or `anthropic,local` if you have an API key) |
| `ANTHROPIC_API_KEY` | (if using Anthropic) |
| `GROQ_API_KEY` | (if using Groq) |
| `OLLAMA_ENDPOINT` | (not needed on Catalyst) |

### 9.4 Health Check

```bash
curl https://ksp-ml-<project-id>.development.catalystserverless.com/health
```

Expected response:
```json
{ "status": "healthy" }
```

---

## 10. Step 5: Deploy React Frontend

The frontend can be deployed as an **AppSail Node.js service** or using **Catalyst Slate** for static hosting.

### 10.1 Option A: AppSail Node.js (Recommended)

#### Build the Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# The output is in frontend/dist/
```

#### Prepare Serving

The frontend needs a static file server. Create `frontend/server.js` for production:

```javascript
const express = require('express');
const path = require('path');
const app = express();

const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 9000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend serving on port ${port}`);
});
```

Add `express` to `package.json` dependencies:
```json
"dependencies": {
  "express": "^4.21.0",
  ...
}
```

Then `npm install`.

#### Deploy as Node.js Managed Runtime

```bash
catalyst deploy appsail \
  --name ksp-frontend \
  --build-path /absolute/path/to/frontend \
  --stack node20 \
  --command "node server.js" \
  --port 9000
```

#### Set Environment Variables

In the `ksp-frontend` AppSail config, set the API base URL. The frontend needs to know the API URL (no proxy in production):

```
VITE_API_BASE_URL=https://ksp-api-<project-id>.development.catalystserverless.com
```

> **Note:** The Vite dev proxy (configured in `vite.config.mts`) is only for local development. In production, the frontend must use the absolute API URL.

#### Update Axios Configuration

Modify `frontend/src/api/axiosConfig.ts` to use the environment variable for the base URL:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Use API_BASE_URL prefix for all requests
axios.defaults.baseURL = API_BASE_URL;

// Update refresh token endpoint too
const resp = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
  // ... rest remains the same
});
```

### 10.2 Option B: Catalyst Slate (Alternative — Static Hosting Only)

If the frontend is a pure SPA with no server-side rendering, you can host it on **Slate** (Catalyst's frontend hosting service):

1. Build: `cd frontend && npm ci && npm run build`
2. In Catalyst Console → **Slate** → **Create New App**
3. Upload the `dist/` directory
4. Set environment variable for the API call to point to the API AppSail URL
5. Deploy

> **Limitation:** Slate hosts static files only. For the SPA routing to work, configure Slate to serve `index.html` for all routes.

---

## 11. Step 6: Data Seeding

### 11.1 Generate Synthetic Data

The data generator (`data-generator/`) needs to connect to the Catalyst Data Store (PostgreSQL) and Cache (Redis). Run it from your local machine after port-forwarding or using direct connections.

```bash
cd data-generator

# Install dependencies
pip install -r requirements.txt

# Run data generation (generates 100K FIRs by default)
python generate.py \
  --postgres \
  --postgres-url "jdbc:postgresql://<data-store-host>:5432/ksp_intelligence" \
  --postgres-user ksp_app \
  --postgres-password <password> \
  --count 100000

# Verify data
python verify.py \
  --postgres \
  --postgres-url "jdbc:postgresql://<data-store-host>:5432/ksp_intelligence" \
  --postgres-user ksp_app \
  --postgres-password <password>
```

### 11.2 Populate Redis Cache (Hotspot Leaderboard)

Use the aggregation script to compute initial hotspot data in Redis:

```bash
# This reads from PostgreSQL and writes hotspot counts to Redis/Cache
python scripts/populate_hotspots.py \
  --redis-host <cache-host> \
  --redis-port 6379 \
  --redis-password <password> \
  --postgres-url "jdbc:postgresql://<data-store-host>:5432/ksp_intelligence" \
  --postgres-user ksp_app \
  --postgres-password <password>
```

> **Note:** This script may need to be adapted for Catalyst. If it doesn't exist in `scripts/`, create it based on the aggregation logic in `api/src/main/java/com/ksp/intelligence/service/AggregationService.java`.

### 11.3 Set Up Full-Text Search Index

After data is loaded, update the full-text search vector:

```sql
-- Rebuild search vectors for all records
UPDATE fir_records SET search_vector = to_tsvector('english',
    COALESCE(crime_type, '') || ' ' ||
    COALESCE(crime_subtype, '') || ' ' ||
    COALESCE(modus_operandi, '') || ' ' ||
    COALESCE(fir_id, '') || ' ' ||
    COALESCE(station_code, '') || ' ' ||
    COALESCE(district_code, '')
);
```

---

## 12. Step 7: Wire Services Together

### 12.1 Update API Environment Variables

After all services are deployed, update the API's environment variables with the actual URLs:

1. Go to **Catalyst Console → AppSail → ksp-api → Configurations**
2. Set `ML_SERVICE_URL` to `https://ksp-ml-<project-id>.development.catalystserverless.com`
3. Set `FRONTEND_URL` to `https://ksp-frontend-<project-id>.development.catalystserverless.com`
4. Click **Save & Redeploy**

### 12.2 Update Frontend Environment Variables

1. Go to **Catalyst Console → AppSail → ksp-frontend → Configurations**
2. Set `VITE_API_BASE_URL` to `https://ksp-api-<project-id>.development.catalystserverless.com`
3. Click **Save & Redeploy**

### 12.3 Verify End-to-End

1. Open the frontend URL in a browser
2. Log in with the default credentials (seeded by the data generator or bootstrapper)
3. Test key features:
   - **Dashboard/Overview** — should load with stats
   - **Hotspots** — should show live leaderboard from Redis
   - **FIR Search** — should return results from PostgreSQL full-text search
   - **NL Query** — type a natural language query (uses ML service + LLM)
   - **Predictions** — hotspot prediction and offender risk scoring

### 12.4 CORS Configuration

If the frontend and API are on different domains (AppSail assigns unique URLs), ensure CORS is properly configured:

In the API's `application.yml` or environment variables:
```yaml
ksp:
  cors:
    allowed-origins: ${FRONTEND_URL:http://localhost:5173}
```

This should already be configured in `SecurityConfig.java`.

---

## 13. Post-Deployment Configuration

### 13.1 Default Users

The API bootstraps default users on first startup (if `DefaultUserBootstrapper` is active). After deployment, verify by logging in as:

| Username | Password | Role |
|----------|----------|------|
| `admin` | (check bootstrapper code) | ADMIN |
| `officer1` | `password1` | ANALYST |

**Change these passwords immediately after first login.**

### 13.2 Custom Domain (Optional)

To use a custom domain instead of the `.development.catalystserverless.com` URL:

1. In Catalyst Console → **AppSail → ksp-api → Settings**
2. Under **Custom Domain**, add your domain
3. Configure CNAME/DNS records as instructed
4. Catalyst provisions SSL automatically

Repeat for the frontend service.

### 13.3 Rate Limiting

Rate limits are configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ANALYST` | 100 | Requests per minute for ANALYST role |
| `RATE_LIMIT_SUPERVISOR` | 200 | Requests per minute for SUPERVISOR role |
| `RATE_LIMIT_ADMIN` | 500 | Requests per minute for ADMIN role |
| `RATE_LIMIT_NL_QUERY` | 10 | Requests per minute for NL query endpoint |

Adjust based on expected usage.

### 13.4 LLM Provider Configuration

The ML service supports a chain of LLM providers. Configure via environment variables:

```
LLM_PROVIDERS=anthropic,groq,gemini,fireworks,local
```

- `local` = regex-based fallback (no API key needed, limited capabilities)
- For full NL query capability, set `ANTHROPIC_API_KEY` or `GROQ_API_KEY`

---

## 14. Monitoring & Logs

### 14.1 Catalyst Logs

Each AppSail service has a logs tab in the Catalyst Console:

- **Real-time logs:** Tail logs during debugging
- **Historical logs:** Search past logs by time range and severity

```bash
# View logs from CLI
catalyst appsail:logs --name ksp-api
catalyst appsail:logs --name ksp-ml
catalyst appsail:logs --name ksp-frontend
```

### 14.2 API Health Endpoints

| Service | Endpoint | Returns |
|---------|----------|---------|
| API | `/actuator/health` | Overall health (DB, Redis, etc.) |
| API | `/actuator/info` | Application info |
| API | `/actuator/metrics` | JVM and request metrics |
| ML | `/health` | ML service health |

### 14.3 Key Metrics to Watch

- **API response times** — Check `http_server_requests_seconds` (if Prometheus is configured)
- **Redis cache hit ratio** — Via Cache console
- **Data Store connections** — Via Data Store console
- **Signals processing lag** — Via Signals console
- **Error rates** — 5xx responses in AppSail logs

### 14.4 Application Performance Monitoring

Catalyst provides **APM** for monitoring function executions and AppSail service performance:

1. In Catalyst Console → **APM**
2. View traces, error rates, and execution times
3. Set up alerts for error thresholds

---

## 15. Continuous Deployment (GitHub → Catalyst Auto-Deploy)

When you push to `main`, the system can automatically build, test, and deploy all services to Catalyst. This is configured via `.github/workflows/deploy.yml`.

### 15.1 How It Works

```
Git Push to main
    │
    ▼
GitHub Actions (test-and-build job)
    │── Maven verify & test (API)
    │── pip install + pytest (ML)
    │── npm ci + npm test (Frontend)
    │── Build Docker images (linux/amd64)
    │── Push images to Docker Hub
    │
    ▼
GitHub Actions (deploy job)
    │── catalyst login (via token)
    │── Deploy API to AppSail
    │── Deploy ML to AppSail
    │── Deploy Frontend to AppSail
    │── Verify health endpoints
```

> **Note:** The CLI package is `zcatalyst-cli` (NOT `zohocatalyst-cli`). All installation and deploy commands use this package.

### 15.2 How the Pipeline Works

```
You push to main
    │
    ▼
GitHub Actions (test-and-build job)
    │── Maven verify + test (API)
    │── pytest (ML)
    │── npm test + build (Frontend)
    │── Build 3 Docker images (linux/amd64)
    │── Save images as .tar.gz artifacts
    │
    ▼
GitHub Actions (deploy job)
    │── Install Catalyst CLI
    │── catalyst login (using token)
    │── Deploy API AppSail (docker-archive)
    │── Deploy ML AppSail (docker-archive)
    │── Deploy Frontend AppSail (docker-archive)
    │── Verify health endpoints
    │
    ▼
    Live on Catalyst ✔
```

No Docker Hub or external registry needed — images are passed directly as GitHub Actions artifacts.

### 15.3 What You Need to Do (Manual Steps)

These steps are required before the pipeline can run. All commands are run on your local machine.

#### Step A: Install Catalyst CLI

```bash
npm install -g zcatalyst-cli
catalyst --version    # verify installation
```

#### Step B: Login & Get Project Info

```bash
catalyst login
# Opens browser — sign in to Zoho, click Accept

catalyst project:list
# Shows your projects. Note down:
#   - Project name (e.g., "KSP Intelligence Portal")
#   - Org ID (e.g., "org_abc123def456")
```

#### Step C: Generate a Token for CI/CD

```bash
catalyst token:generate
# → Copy the generated token string
```

#### Step D: Initialize AppSail Services (one time only)

```bash
# Run each interactively — select Docker Image → use names below:
catalyst appsail:add   # Name: ksp-api
catalyst appsail:add   # Name: ksp-ml
catalyst appsail:add   # Name: ksp-frontend
```

This saves entries in `catalyst.json` so the CLI knows these services exist.

#### Step E: Add 3 GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions** → **New repository secret** and add:

| Secret | Value |
|--------|-------|
| `CATALYST_TOKEN` | Token from `catalyst token:generate` |
| `CATALYST_PROJECT_NAME` | Project name from `catalyst project:list` |
| `CATALYST_ORG` | Org ID from `catalyst project:list` |

### 15.4 After Setup — First Deploy

After steps A–D are done, push to `main`:

```bash
git add .
git commit -m "Initial Catalyst deployment"
git push origin main
```

Go to your GitHub repo → **Actions** tab to watch the pipeline run (~8–12 minutes for first deploy).

### 15.5 Deployment Strategy

- **Trigger:** Every push to `main` branch
- **PRs:** Tests run on PRs (via `ci.yml`) but deployment only on `main` push
- **Rollback:** Re-deploy an older image by running locally:
  ```bash
  catalyst deploy appsail --name ksp-api --source docker-archive://./old-image.tar.gz --port 9000
  ```

### 15.6 Skipping Deployment

Include `[skip-deploy]` in your commit message to push without triggering a deploy:

```bash
git commit -m "Update README only [skip-deploy]"
git push origin main
```

---

## 16. Scaling

### 15.1 AppSail Auto-Scaling

Each AppSail service can be configured to auto-scale based on load:

1. In Catalyst Console → **AppSail → Service → Scaling**
2. Set **Min Instances:** 1
3. Set **Max Instances:** 3-5 (adjust based on expected traffic)
4. Set **CPU Threshold:** 70% (scale up when CPU exceeds this)
5. Set **Memory Threshold:** 80% (scale up when memory exceeds this)

### 15.2 Data Store Scaling

Catalyst Data Store supports plan upgrades:

| Plan | Storage | Max Connections | Use Case |
|------|---------|-----------------|----------|
| Free | 100 MB | 5 | Development |
| Starter | 1 GB | 25 | Low traffic |
| Business | 10 GB | 100 | Production |
| Enterprise | 100 GB | 500 | High traffic |

### 15.3 Cache Scaling

Upgrade the Cache plan as needed:

| Plan | Memory | Use Case |
|------|--------|----------|
| Free | 256 MB | Development |
| Starter | 1 GB | Production |
| Business | 5 GB | High traffic |

### 15.4 Signals Throughput

Catalyst Signals scales automatically. Monitor the **Event Queue Depth** in the Signals dashboard.

---

## 16. Backup & Disaster Recovery

### 16.1 Data Store Backups

Catalyst Data Store provides automated backups:

1. In **Data Store → Backups**
2. Configure **Daily Backup** schedule
3. Set **Retention Period:** 7-30 days
4. Manual backup: Click **Backup Now**

### 16.2 Cache Data

Redis/Cache data is ephemeral. The hotspot leaderboard and rate limiter state will reset on restart. This is acceptable because:
- Hotspot data can be recomputed from PostgreSQL
- Rate limit counters reset
- Session blocklist state resets (sessions expire by TTL)

### 16.3 AppSail Service Redeployment

To redeploy after code changes:

```bash
# Build new image
docker build --platform linux/amd64 -t ksp-api:latest .
docker save ksp-api:latest -o ksp-api.tar

# Deploy again (same command — updates the existing service)
catalyst deploy appsail \
  --name ksp-api \
  --source docker-archive://./ksp-api.tar \
  --port 9000
```

Catalyst performs a rolling update with zero downtime (if multiple instances are configured).

### 16.4 Disaster Recovery Procedure

1. **Restore PostgreSQL:** Data Store → Backups → Restore
2. **Redeploy services:** Run `catalyst deploy` for each AppSail service
3. **Repopulate Redis:** Run the hotspot population script
4. **Verify health:** Check all health endpoints
5. **Test end-to-end:** Login, search, and verify key features

---

## 17. Troubleshooting

### 17.1 Service Won't Start (Port Binding)

**Symptom:** AppSail instance keeps restarting or shows "unhealthy"

**Cause:** The application is not listening on `X_ZOHO_CATALYST_LISTEN_PORT`

**Fix:**
- Ensure `server.port` (Spring Boot) or the app's listen port is set to `${X_ZOHO_CATALYST_LISTEN_PORT:-9000}`
- Verify `EXPOSE 9000` in Dockerfile
- Check logs: `catalyst appsail:logs --name ksp-api`

### 17.2 Database Connection Refused

**Symptom:** API health shows DB DOWN

**Cause:** Wrong host/port/credentials for Data Store

**Fix:**
- Verify `POSTGRES_URL` is correct (format: `jdbc:postgresql://<host>:5432/ksp_intelligence`)
- Check Data Store is in ACTIVE status
- Verify credentials in environment variables
- Check Data Store firewall (within same project, this should not be an issue)

### 17.3 Redis Connection Failed

**Symptom:** API health shows Redis DOWN; hotspot leaderboard is empty

**Cause:** Wrong Cache host/port/password

**Fix:**
- Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Test connection from local machine using `redis-cli -h <host> -p 6379`

### 17.4 CORS Errors in Frontend

**Symptom:** Browser console shows CORS errors; API calls fail

**Cause:** Frontend domain not whitelisted in API CORS config

**Fix:**
- Set `FRONTEND_URL` environment variable in API to the exact AppSail URL of the frontend
- Ensure no trailing slash
- Valid format: `https://ksp-frontend-<project-id>.development.catalystserverless.com`

### 17.5 Signals Topic Not Found

**Symptom:** API cannot publish events; alert pipeline broken

**Cause:** Signals topics not created

**Fix:**
- Verify topics exist in Catalyst Console → Signals
- Check topic names match environment variables
- Re-create topics if missing

### 17.6 ML Service Not Reachable

**Symptom:** NL query fails; prediction endpoints return errors

**Cause:** `ML_SERVICE_URL` is wrong or ML service hasn't started

**Fix:**
- Verify `ML_SERVICE_URL` in API config
- Check ML service logs: `catalyst appsail:logs --name ksp-ml`
- Verify ML health endpoint: `curl <ml-url>/health`

### 17.7 JWT Authentication Failures

**Symptom:** Login succeeds but subsequent API calls return 401

**Cause:** `JWT_SECRET` mismatch between API and frontend (or token expired)

**Fix:**
- Verify `JWT_SECRET` is set correctly in API environment variables
- Check token expiry settings
- Clear browser localStorage and re-login

### 17.8 LLM Query Returns Empty/Generic Results

**Symptom:** NL query returns "I couldn't understand the query" or similar

**Cause:** LLM provider chain failing (no API key, all providers unreachable)

**Fix:**
- Check `LLM_PROVIDERS` setting (default `local` uses regex fallback)
- For full NL capability, add `ANTHROPIC_API_KEY` or `GROQ_API_KEY`
- Check ML service logs for LLM call errors

### 17.9 AppSail CLI Commands Hang

**Symptom:** `catalyst deploy` or `catalyst appsail:logs` hangs at prompt

**Cause:** Missing `--source` or `--name` flags

**Fix:**
- Always use non-interactive mode for deploy: specify all flags
- Use `--source docker-archive://` or `--source docker://`
- Use `--port` flag explicitly

---

## 18. Required Code Modifications Summary

### 18.1 API — Replace Kafka with Catalyst Signals

**Files to modify:**

| File | Change |
|------|--------|
| `api/src/main/java/com/ksp/intelligence/config/KafkaConfig.java` | Replace or disable Kafka config; add Signals SDK config |
| `api/src/main/java/com/ksp/intelligence/consumer/IndexingConsumer.java` | Replace `@KafkaListener` with Signals event handler or HTTP endpoint |
| `api/src/main/java/com/ksp/intelligence/consumer/AggregationConsumer.java` | Same as above |
| `api/src/main/java/com/ksp/intelligence/consumer/AnomalyConsumer.java` | Same as above |
| `api/src/main/java/com/ksp/intelligence/service/AlertPublisher.java` | Replace Kafka producer with Signals publish API call |
| `api/pom.xml` | Remove `spring-kafka` dependency (or keep for local dev); add `com.zoho.catalyst:signals-sdk` |

**Implementation approach (Signals REST API):**

Catalyst Signals can be called via REST API from any HTTP client. No SDK is strictly required:

```java
// Publish event to Signals topic
// POST https://signals.zoho.com/api/v1/<project-id>/topics/<topic-id>/publish
// Headers: Authorization: Zoho-oauthtoken <token>
// Body: { "data": { "firId": "...", ... } }
```

Or use the Catalyst Signals SDK if available for Java.

**Simpler alternative:** Use a REST endpoint pattern instead of an event bus:

```java
@PostMapping("/api/internal/events/fir")
public void handleFirEvent(@RequestBody FirEventDto event) {
    // Call existing service methods directly (IndexingService, AggregationService, AnomalyService)
    CompletableFuture.runAsync(() -> indexingService.index(event));
    CompletableFuture.runAsync(() -> aggregationService.aggregate(event));
    CompletableFuture.runAsync(() -> anomalyService.detect(event));
}
```

This removes the need for an event bus entirely — the API handles FIR events synchronously-asynchronously via thread pools.

### 18.2 API — Replace ElasticSearch with PostgreSQL Full-Text Search

**Files to modify:**

| File | Change |
|------|--------|
| `api/src/main/java/com/ksp/intelligence/service/FirSearchService.java` | Replace `ElasticsearchRestTemplate` queries with native SQL queries using `EntityManager` or JPA |
| `api/src/main/java/com/ksp/intelligence/repository/FirRecordRepository.java` | Add custom `@Query` methods for full-text search and geo search |
| `api/src/main/java/com/ksp/intelligence/config/ElasticsearchConfig.java` | Disable or remove ES config |
| `api/src/main/java/com/ksp/intelligence/service/HotspotService.java` | If ES was used for hotspot computation, replace with PG queries |
| `api/pom.xml` | Remove `spring-boot-starter-data-elasticsearch` dependency |
| `api/src/main/resources/application.yml` | Remove ES health check; add native query config |

**Example JPA full-text search query:**

```java
@Query(value = """
    SELECT f FROM FirRecord f
    WHERE f.searchVector @@ to_tsquery('english', :query)
    ORDER BY ts_rank(f.searchVector, to_tsquery('english', :query)) DESC
    """, nativeQuery = false)
List<FirRecord> searchByText(@Param("query") String query);
```

**Example geo search query:**

```java
@Query(value = """
    SELECT *, earth_distance(
        ll_to_earth(f.latitude, f.longitude),
        ll_to_earth(:lat, :lon)
    ) AS distance
    FROM fir_records f
    WHERE earth_distance(
        ll_to_earth(f.latitude, f.longitude),
        ll_to_earth(:lat, :lon)
    ) <= :radiusMeters
    ORDER BY distance
    LIMIT :limit
    """, nativeQuery = true)
List<Object[]> searchByGeo(@Param("lat") double lat, @Param("lon") double lon,
                           @Param("radiusMeters") double radius, @Param("limit") int limit);
```

### 18.3 API — Use Server Port from Environment

**Modify `api/src/main/resources/application.yml`:**

```yaml
server:
  port: ${SERVER_PORT:8080}
```

This already supports `${SERVER_PORT}`. Set `SERVER_PORT` to match `X_ZOHO_CATALYST_LISTEN_PORT` (9000).

### 18.4 API — Disable ES Health Check

**Modify `api/src/main/resources/application.yml`:**

```yaml
management:
  health:
    elasticsearch:
      enabled: false
```

### 18.5 Frontend — Use API Base URL from Env

**Modify `frontend/src/api/axiosConfig.ts`:**

Add at the top:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
axios.defaults.baseURL = API_BASE_URL;
```

**Modify `frontend/vite.config.mts`:**

Remove the proxy configuration for production builds (or keep for local dev only):
```typescript
server: {
  host: '0.0.0.0',
  port: 5173,
  // proxy only in development
  ...(process.env.NODE_ENV === 'development' ? {
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  } : {}),
},
```

### 18.6 ML Service — No Major Changes

The FastAPI ML service communicates via HTTP (API → ML). No changes needed for Catalyst, except updating the port in `Dockerfile.catalyst` to 9000 (see [Section 9.1](#91-modify-dockerfile-for-catalyst)).

### 18.7 Frontend — Remove/Handle Neo4j Features

**Modify `frontend/src/App.tsx`:** Disable or conditionally hide the Network Graph route:

```typescript
// Only enable if not on Catalyst
{!isCatalystDeployment && (
  <Route path="/network-graph" element={<NetworkGraph />} />
)}
```

Or show a "feature not available" message when the API returns a 501/404 for graph endpoints.

---

## 19. Appendix A: Catalyst CLI Cheat Sheet

```bash
# --- Setup ---
catalyst login                        # Login via browser
catalyst init appsail                 # Initialize AppSail in project (interactive)
catalyst project:list                 # List Catalyst projects
catalyst project:use <project-id>     # Switch project

# --- Deploy ---
# Deploy Docker archive (custom runtime)
catalyst deploy appsail \
  --name <service-name> \
  --source docker-archive://./image.tar \
  --port 9000

# Deploy Docker image from local registry
catalyst deploy appsail \
  --name <service-name> \
  --source docker://image:tag \
  --port 9000

# Deploy managed runtime (Node.js, Java, Python)
catalyst deploy appsail \
  --name <service-name> \
  --build-path /absolute/path \
  --stack node20 \
  --command "node server.js" \
  --port 9000

# --- Manage ---
catalyst appsail:list                 # List all AppSail services
catalyst appsail:logs --name <name>   # View logs
catalyst appsail:status --name <name> # Check status
catalyst deploy --only appsail:<name> # Deploy specific service only

# --- Undeploy ---
catalyst undeploy appsail --name <service-name>

# --- Environment Variables ---
# Set via Catalyst Console (not CLI):
# Console → AppSail → Service → Configurations → Environment Variables

# --- Troubleshooting ---
catalyst appsail:logs --name <name> --since 1h  # Last hour of logs
```

---

## 20. Appendix B: Environment Variables Master Table

### API (Spring Boot AppSail)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_URL` | Yes | — | JDBC connection URL for Data Store |
| `POSTGRES_USER` | Yes | `ksp_app` | Data Store username |
| `POSTGRES_PASSWORD` | Yes | — | Data Store password |
| `REDIS_HOST` | Yes | — | Cache host |
| `REDIS_PORT` | No | `6379` | Cache port |
| `REDIS_PASSWORD` | Yes | — | Cache password |
| `JWT_SECRET` | Yes | — | 256-bit secret for JWT signing |
| `JWT_ACCESS_EXPIRY_MINUTES` | No | `15` | Access token TTL |
| `JWT_REFRESH_EXPIRY_HOURS` | No | `24` | Refresh token TTL |
| `ML_SERVICE_URL` | Yes | — | ML AppSail service URL |
| `FRONTEND_URL` | Yes | — | Frontend AppSail URL (CORS) |
| `SERVER_PORT` | No | `9000` | App listen port (should match `X_ZOHO_CATALYST_LISTEN_PORT`) |
| `SPRING_PROFILES_ACTIVE` | No | `dev` | Spring profile (set to `prod` on Catalyst) |
| `RATE_LIMIT_ANALYST` | No | `100` | Rate limit for ANALYST role (req/min) |
| `RATE_LIMIT_SUPERVISOR` | No | `200` | Rate limit for SUPERVISOR role |
| `RATE_LIMIT_ADMIN` | No | `500` | Rate limit for ADMIN role |
| `RATE_LIMIT_NL_QUERY` | No | `10` | Rate limit for NL query endpoint |
| `SIGNALS_PROJECT_ID` | No | — | Catalyst Signals project ID |
| `SIGNALS_TOPIC_FIR` | No | `fir-events` | Signals topic for FIR events |
| `SIGNALS_TOPIC_ALERT` | No | `alert-events` | Signals topic for alerts |
| `SIGNALS_TOPIC_AUDIT` | No | `audit-events` | Signals topic for audit events |

### ML Service (Python AppSail)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDERS` | No | `local` | Comma-separated LLM provider chain |
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key for Claude |
| `GROQ_API_KEY` | No | — | Groq API key |
| `OLLAMA_ENDPOINT` | No | — | Ollama endpoint (not used on Catalyst) |
| `REDIS_HOST` | No | — | Cache host (for rate limiting) |
| `REDIS_PORT` | No | `6379` | Cache port |
| `REDIS_PASSWORD` | No | — | Cache password |

### Frontend (Node.js AppSail)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes | — | API AppSail service URL (no trailing slash) |

---

## 21. Appendix C: Cost Estimation

Catalyst provides a free tier with $250 credits. Estimated monthly costs for production:

| Service | Plan | Est. Monthly Cost |
|---------|------|-------------------|
| Data Store (PostgreSQL) | Starter ($15/mo for 1GB) | $15 |
| Cache (Redis 256MB) | Free (included) | $0 |
| Signals | Free (up to 1M events/mo) | $0 |
| AppSail — API | Starter ($10/instance) × 1 | $10 |
| AppSail — ML | Starter ($10/instance) × 1 | $10 |
| AppSail — Frontend | Starter ($10/instance) × 1 | $10 |
| **Total** | | **~$45/mo** |

> **Note:** Costs are estimates. Actual costs depend on data transfer, storage usage, and instance uptime. The $250 free credits cover approximately 5-6 months of development/staging usage.

---

## Quick Reference: Deployment Checklist

- [ ] Catalyst account created and logged in
- [ ] Project created in Catalyst Console
- [ ] Data Store (PostgreSQL) provisioned
- [ ] Cache (Redis) provisioned
- [ ] Signals topics created (fir-events, alert-events, audit-events)
- [ ] Database schema loaded (init.sql adapted)
- [ ] Full-text search columns and indexes added
- [ ] API code modified for Catalyst (Kafka → Signals, ES → PG, port config)
- [ ] ML service Docker image built and deployed to AppSail
- [ ] API Docker image built and deployed to AppSail
- [ ] Frontend built and deployed to AppSail/Slate
- [ ] Environment variables set for all services
- [ ] CORS configured (FRONTEND_URL in API)
- [ ] Data seeded (100K FIRs)
- [ ] Full-text search vectors updated
- [ ] Health endpoints verified for all services
- [ ] End-to-end test: login → search → hotspots → NL query
