# Developer Guide — KSP Intelligence Portal

> Practical, step-by-step guide for developers joining the project or for AI agents building features.

---

## 1. Prerequisites

| Tool | Version | Verify |
|------|---------|--------|
| **Java (JDK)** | 21 (OpenJDK or Temurin) | `java -version` |
| **Python** | 3.11+ | `python3 --version` |
| **Node.js** | 20+ | `node --version` |
| **npm** | 10+ | `npm --version` |
| **Maven** | 3.9+ | `mvn --version` |
| **Docker Desktop** | 4.x (8 GB RAM min) | `docker --version` |
| **Git** | 2.x | `git --version` |

---

## 2. First-Time Setup (Step by Step)

```bash
# 1. Clone
git clone https://github.com/starving-array/HotspotHunters-ai.git
cd HotspotHunters-ai

# 2. Environment
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY or GROQ_API_KEY if you want LLM (optional: regex fallback works)
# Set JWT_SECRET to a strong value: openssl rand -hex 32

# 3. Start infrastructure services
docker compose up zookeeper kafka postgres elasticsearch redis -d

# 4. Wait for services to become healthy
docker compose ps    # all should show "healthy"

# 5. Initialize database schema
docker exec -i postgres psql -U ksp_app -d ksp_intelligence < infra/postgres/init.sql

# 6. Create Kafka topics
docker exec kafka bash /infra/kafka/topics.sh

# 7. Create ElasticSearch index mapping
curl -X PUT "localhost:9200/crime-index" \
  -H "Content-Type: application/json" \
  -d @infra/elasticsearch/mappings.json

# 8. Generate synthetic data (100K records, ~2-3 minutes)
cd data-generator
pip install -r requirements.txt
python generate.py --records 100000
```

---

## 3. Docker Compose (Full Stack)

```bash
# Start everything (API, ML, frontend, infra, Prometheus, Grafana)
docker compose up -d

# View logs
docker compose logs -f spring-boot-api
docker compose logs -f python-ml
docker compose logs -f kafka

# Stop
docker compose down

# Nuclear reset (wipes ALL data volumes — use carefully)
docker compose down -v
```

---

## 4. Developing the Spring Boot API

### Project structure

```
api/
├── src/main/java/com/ksp/intelligence/
│   ├── KspIntelligenceApplication.java
│   ├── config/
│   │   ├── RedisConfig.java
│   │   ├── RedisKeysProperties.java
│   │   ├── ElasticSearchConfig.java
│   │   ├── PostgresConfig.java
│   │   ├── KafkaConsumerConfig.java
│   │   ├── JacksonConfig.java
│   │   ├── RestClientConfig.java
│   │   ├── AnomalyProperties.java
│   │   └── SecurityConfig.java          ← JWT, RBAC, endpoint security
│   ├── controller/
│   │   ├── AuthController.java           ← POST /auth/login
│   │   ├── HotspotController.java         ← GET /hotspots
│   │   ├── SearchController.java          ← GET /search (keyword + geo)
│   │   ├── TrendController.java           ← GET /trends/{district}
│   │   ├── AlertStreamController.java     ← GET /alerts/stream (SSE)
│   │   ├── PredictionController.java      ← POST /predict/hotspot, /predict/offender
│   │   ├── NLQueryController.java         ← POST /nl/query
│   │   ├── AuditController.java           ← POST /audit, GET /audit/{id}
│   │   └── GlobalExceptionHandler.java    ← @ControllerAdvice
│   ├── consumer/
│   │   ├── IndexingConsumer.java          → PostgreSQL + ElasticSearch
│   │   ├── AggregationConsumer.java       → Redis SortedSet + Hash + Stream
│   │   └── AnomalyConsumer.java           → spike detection → alert-events
│   ├── service/
│   │   ├── AnomalyDetectionService.java
│   │   └── AlertPublisher.java
│   ├── repository/
│   │   ├── FirRecordRepository.java
│   │   ├── OffenderRepository.java
│   │   └── AuditLogRepository.java
│   ├── filter/
│   │   ├── JwtAuthenticationFilter.java
│   │   └── RateLimitFilter.java
│   └── model/
│       ├── FirRecord.java, FirEventDto.java,
│       ├── Offender.java, Victim.java,
│       ├── AlertEvent.java, AuditLog.java
├── src/main/resources/
│   └── application.yml
└── pom.xml
```

### Key config — `application.yml`

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:kafka:29092}
    consumer:
      auto-offset-reset: earliest
      enable-auto-commit: false
      key-deserializer: org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
      properties:
        spring.deserializer.key.delegate.class: org.apache.kafka.common.serialization.StringDeserializer
        spring.deserializer.value.delegate.class: org.springframework.kafka.support.serializer.JsonDeserializer
        spring.json.trusted.packages: "com.ksp.intelligence.*"
        spring.json.value.default.type: com.ksp.intelligence.model.FirEventDto
    listener:
      ack-mode: manual_immediate
      concurrency: 3
  elasticsearch:
    uris: ${ELASTICSEARCH_SCHEME:http}://${ELASTICSEARCH_HOST:elasticsearch}:${ELASTICSEARCH_PORT:9200}
  data:
    redis:
      host: ${REDIS_HOST:redis}
      port: ${REDIS_PORT:6379}
  datasource:
    url: ${POSTGRES_URL:jdbc:postgresql://${POSTGRES_HOST:postgres}:${POSTGRES_PORT:5432}/${POSTGRES_DB:ksp_intelligence}}
    username: ${POSTGRES_USER:ksp_app}
    password: ${POSTGRES_PASSWORD:changeme}

ksp:
  kafka:
    fir-topic: ${KAFKA_FIR_TOPIC:fir-events}
    alert-topic: ${KAFKA_ALERT_TOPIC:alert-events}
  elasticsearch:
    crime-index: ${ELASTICSEARCH_INDEX:crime-index}
  redis:
    hotspots-key: "hotspots:live"
    district24h-prefix: "district:24h:"
    stream-key: "alerts:stream"
    stream-maxlen: 500
  anomaly:
    rolling-window-minutes: 60
    baseline-window-minutes: 1440
    spike-threshold-sigma: 2.0

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
```

### Adding a new endpoint

1. **Create DTO** in `model/` or `dto/` with Bean Validation annotations.
2. **Create Controller method** in the appropriate controller with `@PreAuthorize` if needed.
3. **Create Service method** (if business logic is non-trivial).
4. **Add Repository query** (JPA `@Query`, ES `NativeSearchQueryBuilder`, or Redis `opsForZSet`).
5. **AuditInterceptor** automatically logs the request — no manual audit call needed.
6. **Write unit test** in `src/test/java/.../controller/` using Mockito.
7. **Add Swagger** — Springdoc auto-generates from annotations; add `@Parameter` for docs.
8. **Test** via curl or Postman.

### Running tests

```bash
mvn test                              # unit tests only
mvn verify                            # unit + integration tests
mvn test -Dtest=HotspotControllerTest # single test class
```

---

## 5. Developing the Python ML Service

### Project structure

```
ml-service/
├── app.py                ← FastAPI app (all 3 endpoints)
├── requirements.txt      ← fastapi, uvicorn, pydantic, httpx, prometheus
└── test_app.py           ← pytest tests
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/predict/hotspot` | 7-day taluk risk prediction |
| POST | `/predict/offender` | Offender recidivism risk score |
| POST | `/nl/translate` | NL → structured ES params (dynamic LLM chain) |

### LLM system prompt (used in `nl_translator`)

```
You are a query translation assistant for a police crime database.
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
```

### Dynamic LLM provider chain

```bash
# .env
LLM_PROVIDERS=anthropic,groq,gemini,fireworks,local
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-haiku-20240307
GROQ_API_KEY=...
GROQ_MODEL=llama3-8b-8192
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
FIREWORKS_API_KEY=...
FIREWORKS_MODEL=fireworks-ai/fireworks-lite
# local = regex fallback (no key needed)
```

The service tries each provider in order. If one fails (network error, auth error, non-JSON response), it falls back to the next. If all fail, the regex parser handles it.

### Running tests

```bash
cd ml-service
pip install -r requirements.txt
pytest test_app.py -v
```

---

## 6. Developing the React Frontend

### Project structure

```
frontend/
├── src/
│   ├── App.tsx                       ← Main layout (sidebar + map area)
│   ├── main.tsx                       ← React entrypoint
│   ├── index.css                      ← Dark theme
│   ├── components/
│   │   ├── SearchBar.tsx              ← Keyword search
│   │   ├── NLQueryBar.tsx             ← Natural-language query
│   │   ├── MapView.tsx                ← Leaflet map with FIR markers
│   │   ├── HotspotLeaderboard.tsx     ← Polls /hotspots every 15s
│   │   ├── LiveAlerts.tsx             ← SSE client (/alerts/stream)
│   │   └── PredictionPanel.tsx         ← Hotspot + offender prediction forms
│   └── axiosInstance.ts               ← Centralized Axios with JWT header
├── vite.config.ts                      ← Vite + proxy /api → :8080
├── tsconfig.json
└── package.json
```

### Adding the SSE live alert stream

```typescript
// LiveAlerts.tsx
useEffect(() => {
  const source = new EventSource('/api/v1/alerts/stream');
  source.onmessage = (e) => {
    const data = JSON.parse(e.data);
    setAlerts(prev => [data, ...prev].slice(0, 20));
  };
  source.onerror = () => {
    setError('Connection lost to alerts stream');
    source.close();
  };
  return () => source.close();
}, []);
```

### Web Speech API voice input (future)

```typescript
 const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
 recognition.onresult = (event) => {
   const transcript = event.results[0][0].transcript;
   setQuery(transcript);
 };
 recognition.start();
```

### Dark theme

CSS variables in `index.css`:

```css
html, body, #root {
  background-color: #1e1e1e;
  color: #f0f0f0;
  font-family: Arial, Helvetica, sans-serif;
}
```

---

## 7. Version Control Workflow

```bash
# Start of day
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/redis-leaderboard

# Commit frequently
git add src/main/java/com/ksp/intelligence/consumer/AggregationConsumer.java
git commit -m "feat(redis): implement ZINCRBY for hotspot sorted set"

# Rebase before merge
git fetch origin
git rebase origin/main

# Merge to main
git checkout main
git merge feat/redis-leaderboard --no-ff
git push origin main

# Tag if phase is complete
git tag -a v0.2.0 -m "Phase 2: Kafka consumer pipeline complete"
git push origin v0.2.0

# Delete branch
git branch -d feat/redis-leaderboard
git push origin --delete feat/redis-leaderboard
```

### Commit message patterns

```
feat(kafka): add three consumer groups for fir-events topic
feat(redis): implement sorted set hotspot leaderboard
feat(es): add geo_distance query to SearchController
feat(ml): train gradient boosting offender risk model with SHAP
feat(llm): integrate dynamic LLM provider chain for NL translation
feat(security): add JWT filter chain with rate limiting
feat(frontend): add Leaflet map with FIR markers
fix(kafka): fix manual offset commit on indexing consumer
fix(es): correct geo_distance query unit from meters to kilometers
chore(docker): add healthcheck to elasticsearch service
docs(adr): add ADR-002 for LLM-as-translator decision
test(api): add integration tests for /hotspots endpoint
```

---

## 8. Environment Variables Reference

| Variable | Required | Default | Where Used | Notes |
|----------|----------|---------|------------|-------|
| `POSTGRES_DB` | Yes | `ksp_intelligence` | Spring Boot, init.sql | |
| `POSTGRES_USER` | Yes | `ksp_app` | Spring Boot | Least-privilege user |
| `POSTGRES_PASSWORD` | Yes | `changeme` | Spring Boot | Never commit |
| `POSTGRES_HOST` | Yes | `postgres` | Spring Boot | `localhost` for non-Docker |
| `KAFKA_BOOTSTRAP_SERVERS` | Yes | `kafka:29092` | Spring Boot | |
| `KAFKA_FIR_TOPIC` | Yes | `fir-events` | Spring Boot, Python | |
| `KAFKA_ALERT_TOPIC` | Yes | `alert-events` | Spring Boot | |
| `ELASTICSEARCH_HOST` | Yes | `elasticsearch` | Spring Boot | |
| `ELASTICSEARCH_PORT` | Yes | `9200` | Spring Boot | |
| `ELASTICSEARCH_INDEX` | Yes | `crime-index` | Spring Boot | |
| `REDIS_HOST` | Yes | `redis` | Spring Boot | |
| `REDIS_PORT` | Yes | `6379` | Spring Boot | |
| `JWT_SECRET` | **Critical** | `changeme123` | Spring Boot | `openssl rand -hex 32` |
| `ML_SERVICE_URL` | Yes | `http://localhost:8001` | Spring Boot | `http://python-ml:8001` in Docker |
| `ANTHROPIC_API_KEY` | No | — | Python ML | For LLM NL translation |
| `GROQ_API_KEY` | No | — | Python ML | Alternative LLM |
| `GEMINI_API_KEY` | No | — | Python ML | Alternative LLM |
| `LLM_PROVIDERS` | No | — | Python ML | Comma-separated provider list |
| `RATE_LIMIT_LIMIT_PER_MINUTE` | No | `60` | Spring Boot | Requests per officer per minute |

---

## 9. API Testing with curl

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"officer1","password":"password1"}' | jq -r .token)

# Hotspot leaderboard
curl -s http://localhost:8080/api/v1/hotspots?limit=5 \
  -H "Authorization: Bearer $TOKEN" | jq .

# Keyword search
curl -s "http://localhost:8080/api/v1/search?q=theft" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Geo search
curl -s "http://localhost:8080/api/v1/search?q=theft&lat=13.1&lon=77.6&radiusKm=5" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Trend
curl -s http://localhost:8080/api/v1/trends/D01?months=12 \
  -H "Authorization: Bearer $TOKEN" | jq .

# NL query
curl -s -X POST http://localhost:8080/api/v1/nl/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"Show me robbery cases near Yelahanka in the last 30 days"}' | jq .

# Hotspot prediction
curl -s -X POST http://localhost:8080/api/v1/predict/hotspot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"district_code":"D01","taluk_code":"T01"}' | jq .

# Offender prediction
curl -s -X POST http://localhost:8080/api/v1/predict/offender \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"offender_id":"O123"}' | jq .

# Live alerts (SSE)
curl -N http://localhost:8080/api/v1/alerts/stream \
  -H "Authorization: Bearer $TOKEN"

# Audit log query (Postgres)
docker exec -it postgres psql -U ksp_app -d ksp_intelligence \
  -c "SELECT * FROM audit_log ORDER BY logged_at DESC LIMIT 5;"
```

---

## 10. Troubleshooting

| Issue | Symptom | Fix |
|-------|---------|-----|
| ElasticSearch OOM | Container exits code 137 | Set `ES_JAVA_OPTS=-Xms512m -Xmx512m` in compose |
| Kafka consumer lag growing | Leaderboard not updating | `docker exec kafka kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --all-groups` |
| Redis connection refused | Spring Boot fails to start | `docker compose up redis -d`, wait for healthy |
| PostgreSQL schema missing | 500 on trend endpoints | `docker exec -i postgres psql -U ksp_app -d ksp_intelligence < infra/postgres/init.sql` |
| LLM returns non-JSON | NL query falls back to regex | Check `ANTHROPIC_API_KEY` is set; check `ml-service` logs |
| CORS error in browser | Frontend shows network error | Ensure Vite proxy config targets `http://localhost:8080` |
| JWT returns 401 | Can't login | Check `JWT_SECRET` is consistent across restarts |
| Docker out of memory | All containers crash | Increase Docker Desktop RAM to 8 GB+ |
| ES mapping error on geo query | 400 on `/search` | Verify mapping: `curl localhost:9200/crime-index/_mapping` |

---

## 11. Observability Access

| Service | URL | Credentials |
|---------|-----|------------|
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3001 | admin / admin |
| API metrics | http://localhost:8080/actuator/prometheus | — |
| ML metrics | http://localhost:8001/metrics | — |
| Swagger UI | http://localhost:8080/swagger-ui.html | — |
| FastAPI docs | http://localhost:8001/docs | — |

---

## 12. Submission Checklist

### Code Quality
- [ ] `mvn test` passes with zero failures
- [ ] `pytest test_app.py -v` passes
- [ ] No hardcoded secrets in codebase
- [ ] `.env` is in `.gitignore` and NOT in git history
- [ ] All endpoints return proper HTTP status codes

### Architecture
- [ ] `docker compose up -d` starts all services and all are healthy
- [ ] Fresh clone → `docker compose up` works in under 5 minutes
- [ ] Kafka consumer lag < 1000 messages
- [ ] ElasticSearch has 100K+ documents indexed
- [ ] Redis `hotspots:live` has district data

### Documentation
- [ ] README.md is complete and impressive
- [ ] docs/ARCHITECTURE.md is complete with all diagrams
- [ ] docs/DEVELOPER_GUIDE.md is complete
- [ ] Swagger UI works
- [ ] `.env.example` has all required variables (no real values)

### Demo
- [ ] Shows `docker compose up` from scratch
- [ ] Shows live FIR events firing and leaderboard updating
- [ ] Shows NL query → map result
- [ ] Shows prediction panel
- [ ] Shows live alerts (SSE)
- [ ] Shows audit trail query

### Git
- [ ] `git tag v1.0.0` is pushed
- [ ] Commit history follows conventional commit format
- [ ] Main branch is clean
