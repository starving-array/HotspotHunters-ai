-- =============================================================================
-- KSP Intelligence Portal — Catalyst Migration Script
-- Adds PostgreSQL full-text search support (replaces ElasticSearch).
-- Run against the Catalyst Data Store to enable search without ES.
-- =============================================================================

-- Enable extensions required for search and geo queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy text matching
CREATE EXTENSION IF NOT EXISTS earthdistance; -- geo distance queries
CREATE EXTENSION IF NOT EXISTS cube;          -- dependency for earthdistance

-- Add search_vector column for full-text search
ALTER TABLE fir_records ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to auto-populate search_vector on insert/update
CREATE OR REPLACE FUNCTION fir_search_update() RETURNS trigger AS $$
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

-- Create trigger to auto-index new/updated records
DROP TRIGGER IF EXISTS trg_fir_search ON fir_records;
CREATE TRIGGER trg_fir_search
    BEFORE INSERT OR UPDATE ON fir_records
    FOR EACH ROW EXECUTE FUNCTION fir_records_search_update();

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_fir_records_search ON fir_records USING GIN(search_vector);

-- Create GIN trigram index for fuzzy ILIKE search on casemaster
CREATE INDEX IF NOT EXISTS idx_casemaster_brieffacts_trgm ON casemaster USING GIN (brieffacts gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_casemaster_crimeno_trgm ON casemaster USING GIN (crimeno gin_trgm_ops);

-- Create geo index on latitude/longitude
CREATE INDEX IF NOT EXISTS idx_casemaster_geo ON casemaster(latitude, longitude);

-- Update existing FIR records with search_vector values
UPDATE fir_records SET search_vector = to_tsvector('english',
    COALESCE(crime_type, '') || ' ' ||
    COALESCE(crime_subtype, '') || ' ' ||
    COALESCE(modus_operandi, '') || ' ' ||
    COALESCE(fir_id, '') || ' ' ||
    COALESCE(station_code, '') || ' ' ||
    COALESCE(district_code, '')
);