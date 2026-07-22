-- =============================================================================
-- KSP Intelligence Portal — Phase 1 Migration
-- Fixes missing tables, populates casemaster, adds security functions/grants
-- =============================================================================

-- =============================================================
-- 1. Create lookup tables (District, Unit)
-- =============================================================

CREATE TABLE IF NOT EXISTS District (
    DistrictID   SERIAL PRIMARY KEY,
    DistrictCode VARCHAR(20) NOT NULL UNIQUE,
    DistrictName VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Unit (
    UnitID      SERIAL PRIMARY KEY,
    DistrictID  INT NOT NULL REFERENCES District(DistrictID),
    StationCode VARCHAR(20) NOT NULL UNIQUE,
    StationName VARCHAR(200)
);

-- Populate District from fir_records data
INSERT INTO District (DistrictCode, DistrictName)
SELECT DISTINCT district_code,
       CASE district_code
           WHEN 'BDR' THEN 'Bidar'
           WHEN 'BGP' THEN 'Bagalkot'
           WHEN 'BJP' THEN 'Bijapur'
           WHEN 'BLG' THEN 'Belgaum'
           WHEN 'BLR_RUR' THEN 'Bangalore Rural'
           WHEN 'BLR_URB' THEN 'Bangalore Urban'
           WHEN 'CHK' THEN 'Chikkaballapur'
           WHEN 'CHM' THEN 'Chamarajanagar'
           WHEN 'CHT' THEN 'Chitradurga'
           WHEN 'DKN' THEN 'Dakshina Kannada'
           WHEN 'DLP' THEN 'Dharwad'
           WHEN 'DVG' THEN 'Davangere'
           WHEN 'GDK' THEN 'Gadag'
           WHEN 'HBL' THEN 'Hassan'
           WHEN 'HVN' THEN 'Haveri'
           WHEN 'HVR' THEN 'Haveri'
           WHEN 'KJP' THEN 'Koppal'
           WHEN 'KLR' THEN 'Kalaburagi'
           WHEN 'KMR' THEN 'Kodagu'
           WHEN 'KNR' THEN 'Kannur'
           WHEN 'MND' THEN 'Mandya'
           WHEN 'MYS' THEN 'Mysuru'
           WHEN 'RBR' THEN 'Raichur'
           WHEN 'RMR' THEN 'Ramanagara'
           WHEN 'SHM' THEN 'Shivamogga'
           WHEN 'TUM' THEN 'Tumakuru'
           WHEN 'UCT' THEN 'Udupi'
           WHEN 'UDU' THEN 'Udupi'
           WHEN 'VJP' THEN 'Vijayapura'
           WHEN 'YDG' THEN 'Yadgir'
           ELSE district_code
       END
FROM fir_records
WHERE NOT EXISTS (SELECT 1 FROM District WHERE DistrictCode = fir_records.district_code);

-- Populate Unit from fir_records data
INSERT INTO Unit (DistrictID, StationCode, StationName)
SELECT d.DistrictID, f.station_code, CONCAT('Police Station ', f.station_code)
FROM (SELECT DISTINCT district_code, station_code FROM fir_records) f
JOIN District d ON d.DistrictCode = f.district_code
WHERE NOT EXISTS (
    SELECT 1 FROM Unit u WHERE u.StationCode = f.station_code
);

-- =============================================================
-- 2. Create ArrestSurrender, Accused (missing parent tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS ArrestSurrender (
    ArrestSurrenderID SERIAL PRIMARY KEY,
    ArrestDate TIMESTAMPTZ,
    PoliceStationID INT REFERENCES Unit(UnitID)
);

CREATE TABLE IF NOT EXISTS Accused (
    AccusedMasterID SERIAL PRIMARY KEY,
    Name VARCHAR(200),
    PoliceStationID INT REFERENCES Unit(UnitID)
);

-- Recreate inv_arrestsurrenderaccused if it didn't exist (drop first if partial)
DROP TABLE IF EXISTS inv_arrestsurrenderaccused;
CREATE TABLE IF NOT EXISTS inv_arrestsurrenderaccused (
    ArrestSurrenderID INT NOT NULL REFERENCES ArrestSurrender(ArrestSurrenderID),
    AccusedMasterID   INT NOT NULL REFERENCES Accused(AccusedMasterID),
    PRIMARY KEY (ArrestSurrenderID, AccusedMasterID)
);

-- =============================================================
-- 3. Fix CrimeNoSerial — drop old (was broken due to missing Unit FK), recreate
-- =============================================================

DROP TABLE IF EXISTS CrimeNoSerial CASCADE;
CREATE TABLE IF NOT EXISTS CrimeNoSerial (
    PoliceStationID INT NOT NULL REFERENCES Unit(UnitID),
    CaseCategoryCode INT NOT NULL,  -- 1=FIR,3=UDR,8=ZeroFIR,4=PAR
    YearValue       INT NOT NULL,
    LastSerial      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (PoliceStationID, CaseCategoryCode, YearValue)
);

-- =============================================================
-- 4. Create get_next_crime_no function with SECURITY DEFINER
-- =============================================================

CREATE OR REPLACE FUNCTION get_next_crime_no(
    p_station_id    INT,
    p_district_id   INT,
    p_category_code INT,
    p_year          INT
) RETURNS VARCHAR AS $$
DECLARE
    v_serial INT;
    v_crime_no VARCHAR(18);
BEGIN
    INSERT INTO CrimeNoSerial (PoliceStationID, CaseCategoryCode, YearValue, LastSerial)
    VALUES (p_station_id, p_category_code, p_year, 1)
    ON CONFLICT (PoliceStationID, CaseCategoryCode, YearValue)
    DO UPDATE SET LastSerial = CrimeNoSerial.LastSerial + 1
    RETURNING LastSerial INTO v_serial;

    v_crime_no := CONCAT(
        p_category_code::TEXT,
        LPAD(p_district_id::TEXT, 4, '0'),
        LPAD(p_station_id::TEXT, 4, '0'),
        p_year::TEXT,
        LPAD(v_serial::TEXT, 5, '0')
    );
    RETURN v_crime_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant function execution to app user
GRANT EXECUTE ON FUNCTION get_next_crime_no(INT, INT, INT, INT) TO ksp_app;

-- Grant CRUD on CrimeNoSerial
GRANT SELECT, INSERT, UPDATE ON CrimeNoSerial TO ksp_app;

-- =============================================================
-- 5. Create audit_log (missing from current DB)
-- =============================================================

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

-- =============================================================
-- 6. Create Act & Section tables (IPC reference tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS Act (
    ActCode VARCHAR(20) PRIMARY KEY,
    ActDescription VARCHAR(500),
    ShortName VARCHAR(50),
    Active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS Section (
    ActCode VARCHAR(20) NOT NULL REFERENCES Act(ActCode),
    SectionCode VARCHAR(20) NOT NULL,
    SectionDescription VARCHAR(500),
    Active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (ActCode, SectionCode)
);

-- Seed required Acts
INSERT INTO Act (ActCode, ActDescription, ShortName, Active) VALUES
    ('IPC','Indian Penal Code','IPC',TRUE),
    ('IT_ACT','Information Technology Act','IT_ACT',TRUE),
    ('SCST','Scheduled Castes and Scheduled Tribes (Prevention) Act','SCST',TRUE),
    ('ARMS','Arms Act','ARMS',TRUE)
ON CONFLICT (ActCode) DO NOTHING;

-- Seed required Sections
INSERT INTO Section (ActCode, SectionCode, SectionDescription, Active) VALUES
    ('IPC','406','Criminal breach of trust',TRUE),
    ('IPC','407','Criminal breach of trust by carrier',TRUE),
    ('IT_ACT','66C','Identity theft',TRUE),
    ('IT_ACT','66D','Cheating by personation using computer resource',TRUE),
    ('SCST','3','Atrocities',TRUE),
    ('ARMS','25','Punishment for certain offences',TRUE)
ON CONFLICT (ActCode, SectionCode) DO NOTHING;

-- =============================================================
-- 7. Populate casemaster from fir_records
-- =============================================================

-- First, clear the 0-row table so we get fresh auto-generated CaseMasterID
TRUNCATE TABLE Inv_OccuranceTime CASCADE;
TRUNCATE TABLE CaseMaster CASCADE;

-- Insert into casemaster from fir_records, generating CrimeNo for each
INSERT INTO casemaster (
    CrimeNo, CrimeRegisteredDate, PoliceStationID, CaseCategoryID,
    IncidentFromDate, IncidentToDate, latitude, longitude, BriefFacts
)
SELECT
    get_next_crime_no(
        u.UnitID::INT,
        d.DistrictID::INT,
        1,  -- FIR
        EXTRACT(YEAR FROM f.incident_ts)::INT
    ),
    f.registered_ts::DATE,
    u.UnitID,
    1,  -- FIR
    f.incident_ts,
    f.incident_ts + INTERVAL '1 hour',
    f.latitude,
    f.longitude,
    CONCAT('FIR ', f.fir_id, ': ', f.crime_type, ' - ', f.modus_operandi)
FROM fir_records f
JOIN District d ON d.DistrictCode = f.district_code
JOIN Unit u ON u.StationCode = f.station_code
WHERE f.incident_ts >= '2021-01-01'
  AND f.incident_ts < '2027-09-01'
ORDER BY f.incident_ts;

-- Update CrimeNoSerial sequence positions based on actual CrimeNo values
UPDATE CrimeNoSerial cns
SET LastSerial = sub.max_serial
FROM (
    SELECT
        cm.PoliceStationID,
        1 AS CaseCategoryCode,
        EXTRACT(YEAR FROM cm.CrimeRegisteredDate)::INT AS YearValue,
        COUNT(*)::INT AS max_serial
    FROM casemaster cm
    GROUP BY cm.PoliceStationID, EXTRACT(YEAR FROM cm.CrimeRegisteredDate)
) sub
WHERE cns.PoliceStationID = sub.PoliceStationID
  AND cns.CaseCategoryCode = sub.CaseCategoryCode
  AND cns.YearValue = sub.YearValue;

-- Populate Inv_OccuranceTime from casemaster
INSERT INTO Inv_OccuranceTime (
    CaseMasterID, CrimeRegisteredDate,
    OccurrenceFromDate, OccurrenceToDate,
    OccurrenceLocation, OccurrenceLatitude, OccurrenceLongitude
)
SELECT
    cm.CaseMasterID, cm.CrimeRegisteredDate,
    cm.IncidentFromDate, cm.IncidentToDate,
    cm.BriefFacts, cm.latitude, cm.longitude
FROM casemaster cm;

-- =============================================================
-- 8. Security grants
-- =============================================================

-- Revoke UPDATE/DELETE on audit_log from PUBLIC and app user
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM ksp_app;

-- Grant INSERT + SELECT only on audit_log
GRANT INSERT, SELECT ON audit_log TO ksp_app;

-- =============================================================
-- 9. Indexes for performance
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_fir_district    ON fir_records(district_code, incident_ts DESC);
CREATE INDEX IF NOT EXISTS idx_fir_crime_type  ON fir_records(crime_type, incident_ts DESC);
CREATE INDEX IF NOT EXISTS idx_fir_geo        ON fir_records(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_offender_risk   ON offenders(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_offender_last_ts ON offenders(last_offense_ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_officer   ON audit_log(officer_id, logged_at DESC);

-- =============================================================
-- 10. Read-only role
-- =============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ksp_readonly') THEN
        CREATE ROLE ksp_readonly LOGIN PASSWORD 'changeme';
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO ksp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ksp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ksp_readonly;
