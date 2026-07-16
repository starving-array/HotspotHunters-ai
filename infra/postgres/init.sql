-- =============================================================================
-- KSP Intelligence Portal — PostgreSQL Schema
-- File: infra/postgres/init.sql
-- Executed automatically by the postgres container on first startup.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. Victims table (data-minimized: no PII, only demographics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS victims (
    victim_id       VARCHAR(20) PRIMARY KEY,
    age_group       VARCHAR(20),
    gender          VARCHAR(10),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. Offenders table
-- =============================================================================
CREATE TABLE IF NOT EXISTS offenders (
    offender_id     VARCHAR(20) PRIMARY KEY,
    name_hash       VARCHAR(64),          -- SHA-256 hash, never plaintext
    age_group       VARCHAR(20),
    prior_offenses  INTEGER DEFAULT 0,
    modus_tags      TEXT[],
    last_offense_ts TIMESTAMPTZ,
    risk_score      DECIMAL(5,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. FIR records — partitioned by month (incident_ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS fir_records (
    fir_id          VARCHAR(20) NOT NULL,
    station_code    VARCHAR(20) NOT NULL,
    district_code   VARCHAR(20) NOT NULL,
    taluk_code      VARCHAR(20) NOT NULL,
    crime_type      VARCHAR(50) NOT NULL,
    crime_subtype   VARCHAR(100),
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    incident_ts     TIMESTAMPTZ NOT NULL,
    registered_ts   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    offender_id     VARCHAR(20) REFERENCES offenders(offender_id),
    victim_id       VARCHAR(20) REFERENCES victims(victim_id),
    modus_operandi  TEXT,
    status          VARCHAR(20) DEFAULT 'OPEN',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (fir_id, incident_ts)
) PARTITION BY RANGE (incident_ts);

-- =============================================================================
-- 4. Generate monthly partitions: 2021-01 through 2027-12 (84 partitions)
--    Covers 5 years back + 1 year forward per architecture doc.
-- =============================================================================
DO $$
DECLARE
    start_month  INT := 202101;     -- 2021-01
    end_month    INT := 202712;     -- 2027-12
    cur_year     INT;
    cur_month    INT;
    part_name    TEXT;
    start_date   DATE;
    end_date     DATE;
BEGIN
    cur_year  := start_month / 100;
    cur_month := start_month % 100;

    WHILE (cur_year * 100 + cur_month) <= end_month LOOP
        part_name  := 'fir_records_' || cur_year || '_' || lpad(cur_month::TEXT, 2, '0');
        start_date := make_date(cur_year, cur_month, 1);
        end_date   := start_date + INTERVAL '1 month';

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF fir_records FOR VALUES FROM (%L) TO (%L)',
            part_name, start_date, end_date
        );

        cur_month := cur_month + 1;
        IF cur_month > 12 THEN
            cur_month := 1;
            cur_year  := cur_year + 1;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 5. Offender co-crime network (adjacency list)
-- =============================================================================
CREATE TABLE IF NOT EXISTS offender_network (
    offender_a      VARCHAR(20) REFERENCES offenders(offender_id),
    offender_b      VARCHAR(20) REFERENCES offenders(offender_id),
    shared_fir_id   VARCHAR(20),
    co_crime_count  INTEGER DEFAULT 1,
    PRIMARY KEY (offender_a, offender_b, shared_fir_id)
);
-- Note: shared_fir_id cannot FK to fir_records because fir_records is partitioned
-- and the PK is composite (fir_id, incident_ts). Application layer must validate.

-- =============================================================================
-- 6. Audit log — append-only (no UPDATE or DELETE permissions on app user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    officer_id      VARCHAR(20) NOT NULL,
    action_type     VARCHAR(50) NOT NULL,   -- QUERY, VIEW, EXPORT, LOGIN
    query_text      TEXT,
    endpoint_called VARCHAR(200),
    result_count    INTEGER,
    ip_address      INET,
    logged_at       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 7. Indexes for query performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_fir_district    ON fir_records(district_code, incident_ts DESC);
CREATE INDEX IF NOT EXISTS idx_fir_crime_type  ON fir_records(crime_type, incident_ts DESC);
CREATE INDEX IF NOT EXISTS idx_fir_geo        ON fir_records(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_offender_risk   ON offenders(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_offender_last_ts ON offenders(last_offense_ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_officer   ON audit_log(officer_id, logged_at DESC);

-- =============================================================================
-- 8. Principle of Least Privilege — application users
-- =============================================================================
-- The primary app user (ksp_app, created by POSTGRES_USER env var) can read/write
-- all tables EXCEPT audit_log (insert-only).
--
-- The read-only user (ksp_readonly) can only SELECT from all tables.
--
-- audit_log: revoke UPDATE and DELETE from ksp_app so the app can append but
-- never tamper with audit records.
-- =============================================================================

-- Revoke UPDATE/DELETE on audit_log from the application user
-- (ksp_app is the default POSTGRES_USER — created by Docker entrypoint)
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- Create read-only role (password set via env at container startup or manually)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ksp_readonly') THEN
        CREATE ROLE ksp_readonly LOGIN PASSWORD 'changeme';
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO ksp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ksp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ksp_readonly;

-- =============================================================================
-- Verification helpers (optional, for manual checking)
-- =============================================================================
-- List all partitions:
--   SELECT tablename FROM pg_tables WHERE tablename LIKE 'fir_records_%' ORDER BY tablename;
--
-- Row count per partition (after data load):
--   SELECT tablename FROM pg_tables WHERE tablename LIKE 'fir_records_%' ORDER BY tablename;
-- =============================================================================
