# Changelog

All notable changes to the KSP Intelligence Portal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 0 (Setup)
- Docker Compose with 5 infrastructure services + health checks (Zookeeper, Kafka, Postgres, ElasticSearch, Redis)
- Kafka topic initialization script (`infra/kafka/topics.sh`) — creates fir-events (30p), alert-events (6p), audit-events (6p)
- PostgreSQL schema (`infra/postgres/init.sql`) — fir_records (monthly partitioned 2021–2027), offenders, victims, offender_network, audit_log
- ElasticSearch index mapping (`infra/elasticsearch/mappings.json`) — geo_point for location, english analyzer for modus_operandi
- `.env.example` with all required env var placeholders
- `.gitignore` for secrets, build artifacts, IDE files
- Dev Docker Compose override with Kibana
- README with quick-start and architecture overview

### Added — Phase 1 (Data Foundation)
- Synthetic data generator (`data-generator/`) with deterministic seeded RNG
- Reference data for 30 Karnataka districts, 199 taluks, 1413 stations, 7 crime types, 14 modus operandi tags
- `generate.py` produces 100K FIRs (5-year history), 15K offenders (SHA-256 name_hash, modus_tags), 80K victims (PII-minimized), 5K offender-network edges
- `bulk_load.py` loads to PostgreSQL via COPY FROM STDIN (idempotent — TRUNCATE + reload) and to ElasticSearch via helpers.bulk (idempotent — _id = fir_id)
- `kafka_producer.py` streams live FIR events to fir-events topic (key=district_code, configurable interval — default 3s)
- `verify.py` checks row counts in PG + ES + Kafka topic partition integrity
- 49 pytest unit tests covering: district/station uniqueness, GPS bounds, crime type weights, FK integrity, reproducibility
- Dockerfile for containerized runs; wired into `infra/docker-compose.yml` under `tools` profile (no auto-start)
- Package layout with `__init__.py` allowing both `python -m data_generator.X` and direct-script invocation

### Added — Phase 2 (Kafka Consumer Pipeline)
- Spring Boot 3.3.2 / Java 17 Maven project (`api/`) with all Phase 2 dependencies (spring-kafka 3.3.0, spring-data-jpa, spring-data-redis, spring-data-elasticsearch, h2 + testcontainers for tests)
- Env-driven config in `api/src/main/resources/application.yml` (Postgres / Kafka / ElasticSearch / Redis / app-specific keys overridable via env vars per `.env.example`)
- JPA entities: `FirRecord`, `Offender`, `Victim`, `AuditLog` and Kafka payload `FirEventDto`; `AlertEvent` model for spike alerts
- Three consumer groups on `fir-events` topic (manual ack, idempotent on replay via `fir_id` ES doc id):
  - `IndexingConsumer` (group: `indexing-service`) — dual write Postgres (JPA) + ElasticSearch, fails-closed (no ack on error)
  - `AggregationConsumer` (group: `aggregation-service`) — Redis `ZINCRBY hotspots:live` + per-district `HINCRBY` Hash + `XADD alerts:stream` (capped 500)
  - `AnomalyConsumer` (group: `anomaly-service`) — 60-min rolling-window spike detection; publishes `AlertEvent` to `alert-events` topic at HIGH severity above 3σ
- `AnomalyDetectionService` — Poisson-approximation stddev (stddev≈√mean), cold-start guard (baseline ≥ 30), graceful degradation on Redis errors
- `AlertPublisher` — emits `AlertEvent` on the `alert-events` topic via `KafkaTemplate`
- Config classes: `KafkaConsumerConfig` (ErrorHandlingDeserializer + JsonDeserializer for `FirEventDto`, manual_immediate ack, autoStartup honors `spring.kafka.listener.auto-startup`), `PostgresConfig`, `ElasticSearchConfig`, `RedisConfig` (Lettuce pool), `RestClientConfig`, typed `AnomalyProperties` + `RedisKeysProperties` via `@ConfigurationProperties`
- Repositories: `FirRecordRepository`, `OffenderRepository` (Spring Data JPA)
- Multi-stage `api/Dockerfile` (Maven build → eclipse-temurin:17-jre-alpine runtime, tests skipped at image build)
- `spring-boot-api` service uncommented in `infra/docker-compose.yml` (depends on healthy Postgres/Kafka/Redis/ES)
- 16 unit tests (Mockito + AssertJ): `IndexingConsumerTest` (3), `AggregationConsumerTest` (2), `AnomalyConsumerTest` (4), `AnomalyDetectionServiceTest` (6 — incl. cold-start, boundary z=2, low z, redis-error graceful, empty window), `KspIntelligenceApplicationTest` (1 — context loads with H2 in PostgreSQL mode, mocks KafkaTemplate / ElasticsearchOperations / StringRedisTemplate, excludes ElasticSearchConfig + KafkaConsumerConfig from component scan)
- `mvn clean test` passes clean (verified via `docker run maven:3.9-eclipse-temurin-17`)

### Fixed — Phase 2
- Removed invalid `precision` / `scale` attributes from `Double`-typed `@Column` declarations (`FirRecord.latitude`, `FirRecord.longitude`, `Offender.riskScore`) — these caused Hibernate `IllegalArgumentException: scale has no meaning for SQL floating point types` under H2 PostgreSQL-mode DDL generation
- `KafkaConsumerConfig` now honors `spring.kafka.listener.auto-startup` (previously the property was declared in `application.yml` but never read by the manually-built `ConcurrentKafkaListenerContainerFactory`), allowing the context-load test to bring up Spring with `auto-startup=false`
- `AnomalyDetectionServiceTest.zAboveThreshold_returnsSpike` mock baseline/current values now match the service's actual `mean = baseline/baselineWindow × rollingWindow` formula
### Completed — Phase 2
- Live pipeline verified: 100 synthetic FIR events streamed via `kafka_producer.py`; Redis sorted set `hotspots:live` now contains the expected district rankings (ZCARD > 0) and the alerts stream has the correct length.
- All unit tests (`mvn clean test`) and integration tests (`mvn verify`) pass.
