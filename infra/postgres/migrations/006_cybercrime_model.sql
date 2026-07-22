-- =============================================================================
-- Phase 6a: Cybercrime Data Model + OSINT Enrichment Cache
-- Adds cybercrime-specific extension tables referencing CaseMaster.
-- =============================================================================

-- 1. Cybercrime indicators (one-to-many from CaseMaster)
--    A single case can involve multiple IPs, domains, wallets, etc.
CREATE TABLE IF NOT EXISTS cyber_indicators (
    indicator_id    SERIAL          PRIMARY KEY,
    casemasterid    INTEGER         NOT NULL REFERENCES casemaster(casemasterid) ON DELETE CASCADE,
    indicator_type  VARCHAR(50)     NOT NULL
        CHECK (indicator_type IN (
            'ip', 'domain', 'wallet', 'phone', 'bank_account',
            'social_handle', 'email', 'upi_id', 'device_id'
        )),
    indicator_value VARCHAR(500)    NOT NULL,
    platform        VARCHAR(100),             -- WhatsApp, Telegram, Instagram, Facebook, etc.
    extracted_from  TEXT,                     -- which field/text the indicator was extracted from
    first_seen      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN         NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_cyber_indicator_type
    ON cyber_indicators(indicator_type);
CREATE INDEX IF NOT EXISTS idx_cyber_indicator_value
    ON cyber_indicators(indicator_value);
CREATE INDEX IF NOT EXISTS idx_cyber_indicator_casemaster
    ON cyber_indicators(casemasterid);
CREATE INDEX IF NOT EXISTS idx_cyber_indicator_type_value
    ON cyber_indicators(indicator_type, indicator_value);

COMMENT ON TABLE cyber_indicators IS
    'One-to-many cybercrime indicators per case — IPs, domains, wallets, phones, etc.';
COMMENT ON COLUMN cyber_indicators.platform IS
    'Social platform or app name (e.g. WhatsApp, Telegram, Instagram, Facebook)';


-- 2. OSINT enrichment cache
--    Stores results from external threat-intel lookups to avoid redundant API calls.
CREATE TABLE IF NOT EXISTS osint_cache (
    cache_id        SERIAL          PRIMARY KEY,
    entity_type     VARCHAR(50)     NOT NULL,
    entity_value    VARCHAR(500)    NOT NULL,
    source          VARCHAR(100)    NOT NULL,   -- VirusTotal, AbuseIPDB, etc.
    raw_response    JSONB,
    threat_score    INTEGER         CHECK (threat_score BETWEEN 0 AND 100),
    is_malicious    BOOLEAN         NOT NULL DEFAULT false,
    enriched_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP,
    UNIQUE (entity_type, entity_value, source)
);

CREATE INDEX IF NOT EXISTS idx_osint_cache_lookup
    ON osint_cache(entity_type, entity_value);
CREATE INDEX IF NOT EXISTS idx_osint_cache_expires
    ON osint_cache(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE osint_cache IS
    'Cache for OSINT enrichment lookups — avoids redundant API calls to VirusTotal, AbuseIPDB, etc.';


-- 3. Cyber trend alerts (pre-computed patterns for the dashboard)
CREATE TABLE IF NOT EXISTS cyber_trend_alerts (
    alert_id        SERIAL          PRIMARY KEY,
    pattern_type    VARCHAR(50)     NOT NULL
        CHECK (pattern_type IN ('ip_cluster', 'domain_cluster', 'phone_cluster',
                                'wallet_cluster', 'platform_spike', 'financial_fraud_ring')),
    entity_type     VARCHAR(50),
    entity_value    VARCHAR(500),
    case_count      INTEGER         NOT NULL DEFAULT 1,
    first_case_id   INTEGER         REFERENCES casemaster(casemasterid),
    last_case_id    INTEGER         REFERENCES casemaster(casemasterid),
    first_seen      TIMESTAMP,
    last_seen       TIMESTAMP,
    threat_level    VARCHAR(20)     NOT NULL DEFAULT 'medium'
        CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
    details         JSONB
);

CREATE INDEX IF NOT EXISTS idx_cyber_alert_pattern
    ON cyber_trend_alerts(pattern_type);
CREATE INDEX IF NOT EXISTS idx_cyber_alert_threat
    ON cyber_trend_alerts(threat_level);
CREATE INDEX IF NOT EXISTS idx_cyber_alert_last_seen
    ON cyber_trend_alerts(last_seen DESC);

COMMENT ON TABLE cyber_trend_alerts IS
    'Pre-computed cybercrime pattern alerts — IP/domain/phone clusters, platform spikes, fraud rings';


-- 4. Extend CaseMaster with aggregate cybercrime fields
ALTER TABLE casemaster ADD COLUMN IF NOT EXISTS is_cybercrime    BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE casemaster ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(100);
ALTER TABLE casemaster ADD COLUMN IF NOT EXISTS financial_loss   NUMERIC(15, 2);
ALTER TABLE casemaster ADD COLUMN IF NOT EXISTS cyber_severity   VARCHAR(20)
    CHECK (cyber_severity IN ('low', 'medium', 'high', 'critical'));

COMMENT ON COLUMN casemaster.is_cybercrime IS
    'Flag indicating whether this case involves any cybercrime indicators';
COMMENT ON COLUMN casemaster.primary_platform IS
    'Primary platform involved (WhatsApp, Telegram, Instagram, etc.)';
COMMENT ON COLUMN casemaster.financial_loss IS
    'Monetary loss amount (in INR) for financial cybercrimes';
COMMENT ON COLUMN casemaster.cyber_severity IS
    'Cyber-specific severity rating (low/medium/high/critical)';


-- 5. Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ksp_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ksp_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ksp_readonly;
