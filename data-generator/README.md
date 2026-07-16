# Data Generator (Phase 1)

Synthetic crime data generator for the KSP Intelligence Portal. Generates 100K FIR records, 15K offenders, 80K victims, and 5K network edges — bulk-loads them into PostgreSQL + ElasticSearch, then streams live events to Kafka.

## Files

| File | Purpose |
|---|---|
| `config.py` | Reference data: 30 districts, taluks, 1100+ stations, crime types, MO tags, GPS bounds |
| `generate.py` | Core synthetic data generator (seeded RNG, deterministic IDs, GPS-clustering) |
| `bulk_load.py` | Bulk insert to PostgreSQL (COPY) + bulk index to ElasticSearch |
| `kafka_producer.py` | Live streaming producer — 1 event / 3s (configurable) to `fir-events` topic |
| `verify.py` | Verify row counts in PG/ES, Kafka topics exist with correct partitions |
| `tests/test_config.py` | Unit tests for config integrity (districts, weights, uniqueness) |
| `tests/test_generate.py` | Unit tests for generated data (counts, GPS, FK integrity, reproducibility) |
| `Dockerfile` | Container image — runs alongside infra via docker compose |

## Commands (Docker — recommended)

From the `infra/` directory (after `docker compose up -d`):

```bash
# 1. Run unit tests
docker compose run --rm data-generator python -m pytest tests/ -v

# 2. Bulk-load 100K records into Postgres + ElasticSearch
docker compose run --rm data-generator python -m data_generator.bulk_load

# 3. Verify load
docker compose run --rm data-generator python -m data_generator.verify

# 4. Start live streaming to Kafka (Ctrl-C to stop)
docker compose run --rm data-generator python -m data_generator.kafka_producer
```

## Commands (local venv — alternative)

```bash
cd data-generator
python -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Unit tests (no infra required)
python -m pytest tests/ -v

# Bulk load (requires infra running on host ports)
python -m data_generator.bulk_load --pg-host localhost --es-host localhost:9200

# Live producer (requires Kafka on localhost:9092)
python -m data_generator.kafka_producer --bootstrap localhost:9092 --interval 3

# Verify
python -m data_generator.verify --pg-host localhost --es-host localhost:9200 \
    --bootstrap localhost:9092
```

## Configuration

Defaults (in `config.py`):
- `100,000` FIR records (last 5 years)
- `15,000` offenders (SHA-256 name_hash)
- `80,000` victims (age_group + gender only)
- `5,000` network edges (co-crime pairs)
- Random seed `42` (reproducible)

Environment variables (override defaults):
| Variable | Default | Description |
|---|---|---|
| `POSTGRES_HOST` | `localhost` | PG host |
| `POSTGRES_PORT` | `5432` | PG port (use 5432 outside docker) |
| `POSTGRES_USER` | `ksp_app` | PG user |
| `POSTGRES_PASSWORD` | `changeme` | PG password |
| `POSTGRES_DB` | `ksp_intelligence` | PG database |
| `ELASTICSEARCH_HOST` | `localhost` | ES host |
| `ELASTICSEARCH_PORT` | `9200` | ES port |
| `ELASTICSEARCH_INDEX` | `crime-index` | ES index name |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka brokers |
| `KAFKA_FIR_TOPIC` | `fir-events` | Kafka topic |
| `STREAM_INTERVAL_SECONDS` | `3` | Seconds between live events |

## Data Privacy

Per architecture doc §7.3:
- Offender names are **SHA-256 hashed** — never stored as plaintext
- Victims store only `age_group` and `gender` — no PII
- GPS coordinates are rounded to **4 decimal places** (±11m precision)

## Test Coverage

`tests/test_config.py` (14 tests):
- District count = 30, codes unique, centroids inside Karnataka bbox
- Taluks/stations match district counts, codes unique
- Crime type weights sum to 1.0, each has subtypes
- Status/age/gender weights sum to 1.0, list/weights lengths match
- MO tags non-empty and unique, ID prefixes correct, bbox sane

`tests/test_generate.py` (25+ tests):
- Record counts match requested sizes
- All IDs unique
- All GPS coords inside Karnataka bounding box, rounded to 4 decimals
- All crime types and statuses from allowed set
- Offender `name_hash` is 64-char hex, `prior_offenses >= 0`, `risk_score` in range
- MO tags subset of config, age groups in allowed set, victim genders in allowed set
- Timestamps timezone-aware, registered_ts >= incident_ts
- FK integrity: FIR offender references exist in offender pool
- Reproducibility: same seed → identical first FIR (district, GPS, fir_id)
- Different seed → different GPS records
- Network edges reference existing offenders, target count met
- Distribution sanity: no single district >30% of FIRs, no crime type >50%
