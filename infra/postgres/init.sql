-- =============================================================================
-- KSP Intelligence Portal — PostgreSQL Schema
-- File: infra/postgres/init.sql
-- Executed automatically by the postgres container on first startup.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- ROLE SETUP (Phase 0)
-- =============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ksp_app') THEN
        CREATE ROLE ksp_app WITH LOGIN PASSWORD 'changeme';
    END IF;
END $$;

GRANT CONNECT ON DATABASE ksp_intelligence TO ksp_app;
GRANT USAGE ON SCHEMA public TO ksp_app;

-- Switch to the target database for all subsequent DDL
\c ksp_intelligence

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

-- =============================================================
-- CASEMASTER (core FIR table — simplified version for Phase 1)
-- =============================================================
CREATE TABLE IF NOT EXISTS CaseMaster (
    CaseMasterID SERIAL,
    CrimeNo VARCHAR(18) NOT NULL,
    CaseNo VARCHAR(9),
    CrimeRegisteredDate DATE NOT NULL,
    PolicePersonID INT,
    PoliceStationID INT NOT NULL,
    CaseCategoryID INT,
    GravityOffenceID INT,
    CrimeMajorHeadID INT,
    CrimeMinorHeadID INT,
    CaseStatusID INT,
    CourtID INT,
    IncidentFromDate TIMESTAMP,
    IncidentToDate TIMESTAMP,
    InfoReceivedPSDate TIMESTAMP,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    BriefFacts TEXT,
    PRIMARY KEY (CaseMasterID, CrimeRegisteredDate)
);

-- =============================================================
-- 6. Lookup tables (District, Unit — needed by CrimeNoSerial)
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

-- =============================================================
-- 7. CCTNS parent tables (ArrestSurrender, Accused)
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

-- =============================================================
-- 8. Junction table for ArrestSurrender ↔ Accused
-- =============================================================

CREATE TABLE IF NOT EXISTS inv_arrestsurrenderaccused (
    ArrestSurrenderID INT NOT NULL REFERENCES ArrestSurrender(ArrestSurrenderID),
    AccusedMasterID   INT NOT NULL REFERENCES Accused(AccusedMasterID),
    PRIMARY KEY (ArrestSurrenderID, AccusedMasterID)
);

-- =============================================================
-- 9. Inv_OccuranceTime (one‑to‑one with CaseMaster)
-- =============================================================

CREATE TABLE IF NOT EXISTS Inv_OccuranceTime (
    CaseMasterID        INT PRIMARY KEY,
    CrimeRegisteredDate DATE NOT NULL,
    OccurrenceFromDate  TIMESTAMP,
    OccurrenceToDate    TIMESTAMP,
    OccurrenceLocation  VARCHAR(500),
    OccurrenceLatitude  DECIMAL(10,7),
    OccurrenceLongitude DECIMAL(10,7),
    FOREIGN KEY (CaseMasterID, CrimeRegisteredDate)
        REFERENCES CaseMaster(CaseMasterID, CrimeRegisteredDate)
);

-- =============================================================
-- 10. CrimeNoSerial – tracks per‑station/category/year serials
-- =============================================================

CREATE TABLE IF NOT EXISTS CrimeNoSerial (
    PoliceStationID INT NOT NULL REFERENCES Unit(UnitID),
    CaseCategoryCode INT NOT NULL,  -- 1=FIR,3=UDR,8=ZeroFIR,4=PAR
    YearValue       INT NOT NULL,
    LastSerial      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (PoliceStationID, CaseCategoryCode, YearValue)
);

-- =============================================================
-- 11. Function to atomically get next CrimeNo and format it
--     SECURITY DEFINER ensures the function runs with owner privileges
--     regardless of the calling user's permissions on CrimeNoSerial.
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

-- =============================================================
-- SECURITY & GRANTS FOR ksp_app
-- =============================================================
GRANT EXECUTE ON FUNCTION get_next_crime_no(INT, INT, INT, INT) TO ksp_app;
GRANT SELECT, INSERT, UPDATE ON CrimeNoSerial TO ksp_app;

-- =============================================================
-- 12. Audit log — append-only (no UPDATE or DELETE on app user)
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

-- Revoke UPDATE/DELETE from PUBLIC and from the app user
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM ksp_app;

-- Grant only INSERT and SELECT to the app user
GRANT INSERT, SELECT ON audit_log TO ksp_app;

-- =============================================================
-- 13. ACT & SECTION tables (IPC reference)
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
-- 14. Additional Lookup Tables (Phase 3a — ER Diagram compliance)
-- =============================================================

-- 14a. State
CREATE TABLE IF NOT EXISTS State (
    StateID       SERIAL PRIMARY KEY,
    StateName     VARCHAR(100) NOT NULL,
    NationalityID INT DEFAULT 1,
    Active        BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO State (StateName, NationalityID, Active) VALUES
    ('Karnataka', 1, TRUE),
    ('Andhra Pradesh', 1, TRUE),
    ('Tamil Nadu', 1, TRUE),
    ('Kerala', 1, TRUE),
    ('Maharashtra', 1, TRUE),
    ('Goa', 1, TRUE),
    ('Telangana', 1, TRUE),
    ('Other State', 1, TRUE)
ON CONFLICT DO NOTHING;

-- 14b. UnitType
CREATE TABLE IF NOT EXISTS UnitType (
    UnitTypeID    SERIAL PRIMARY KEY,
    UnitTypeName  VARCHAR(100) NOT NULL,
    CityDistState VARCHAR(50),
    Hierarchy     INT,
    Active        BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO UnitType (UnitTypeName, CityDistState, Hierarchy, Active) VALUES
    ('Police Station', 'District', 5, TRUE),
    ('Circle Office', 'District', 4, TRUE),
    ('District Office', 'District', 3, TRUE),
    ('Range Office', 'State', 2, TRUE),
    ('State HQ', 'State', 1, TRUE)
ON CONFLICT DO NOTHING;

-- 14c. Rank
CREATE TABLE IF NOT EXISTS Rank (
    RankID    SERIAL PRIMARY KEY,
    RankName  VARCHAR(100) NOT NULL,
    Hierarchy INT,
    Active    BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO Rank (RankName, Hierarchy, Active) VALUES
    ('Constable', 10, TRUE),
    ('Head Constable', 9, TRUE),
    ('Assistant Sub-Inspector', 8, TRUE),
    ('Sub-Inspector', 7, TRUE),
    ('Inspector', 6, TRUE),
    ('Deputy Superintendent', 5, TRUE),
    ('Additional Superintendent', 4, TRUE),
    ('Superintendent', 3, TRUE),
    ('Deputy Inspector General', 2, TRUE),
    ('Inspector General', 1, TRUE)
ON CONFLICT DO NOTHING;

-- 14d. Designation
CREATE TABLE IF NOT EXISTS Designation (
    DesignationID    SERIAL PRIMARY KEY,
    DesignationName  VARCHAR(100) NOT NULL,
    Active           BOOLEAN NOT NULL DEFAULT TRUE,
    SortOrder        INT DEFAULT 0
);

INSERT INTO Designation (DesignationName, Active, SortOrder) VALUES
    ('Investigating Officer', TRUE, 1),
    ('Station House Officer', TRUE, 2),
    ('Circle Inspector', TRUE, 3),
    ('Deputy Superintendent', TRUE, 4),
    ('Superintendent', TRUE, 5)
ON CONFLICT DO NOTHING;

-- 14e. CaseCategory
CREATE TABLE IF NOT EXISTS CaseCategory (
    CaseCategoryID SERIAL PRIMARY KEY,
    LookupValue    VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO CaseCategory (LookupValue) VALUES
    ('FIR'), ('UDR'), ('PAR'), ('Zero FIR')
ON CONFLICT DO NOTHING;

-- 14f. GravityOffence
CREATE TABLE IF NOT EXISTS GravityOffence (
    GravityOffenceID SERIAL PRIMARY KEY,
    LookupValue      VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO GravityOffence (LookupValue) VALUES
    ('Heinous'), ('Non-Heinous')
ON CONFLICT DO NOTHING;

-- 14g. CaseStatusMaster
CREATE TABLE IF NOT EXISTS CaseStatusMaster (
    CaseStatusID   SERIAL PRIMARY KEY,
    CaseStatusName VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO CaseStatusMaster (CaseStatusName) VALUES
    ('Under Investigation'), ('Charge Sheeted'), ('Closed'),
    ('Transferred'), ('Pending Court')
ON CONFLICT DO NOTHING;

-- 14h. CrimeHead
CREATE TABLE IF NOT EXISTS CrimeHead (
    CrimeHeadID    SERIAL PRIMARY KEY,
    CrimeGroupName VARCHAR(200) NOT NULL,
    Active         BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO CrimeHead (CrimeGroupName, Active) VALUES
    ('Crimes Against Body', TRUE),
    ('Crimes Against Property', TRUE),
    ('Crimes Against Women', TRUE),
    ('Crimes Against Children', TRUE),
    ('Cyber Crimes', TRUE),
    ('Economic Offences', TRUE),
    ('Drug Related Offences', TRUE),
    ('Other Crimes', TRUE)
ON CONFLICT DO NOTHING;

-- 14i. CrimeSubHead
CREATE TABLE IF NOT EXISTS CrimeSubHead (
    CrimeSubHeadID SERIAL PRIMARY KEY,
    CrimeHeadID    INT NOT NULL REFERENCES CrimeHead(CrimeHeadID),
    CrimeHeadName  VARCHAR(200) NOT NULL,
    SeqID          INT DEFAULT 0
);

INSERT INTO CrimeSubHead (CrimeHeadID, CrimeHeadName, SeqID) VALUES
    (1, 'Murder', 1), (1, 'Attempt to Murder', 2),
    (1, 'Assault', 3), (1, 'Grievous Hurt', 4),
    (2, 'Robbery', 1), (2, 'Burglary', 2),
    (2, 'Theft', 3), (2, 'Property Crime', 4),
    (3, 'Rape', 1), (3, 'Sexual Harassment', 2), (3, 'Dowry Death', 3),
    (4, 'Child Labour', 1), (4, 'Child Marriage', 2),
    (5, 'Identity Theft', 1), (5, 'Cyber Fraud', 2),
    (5, 'Phishing', 3), (5, 'Cyber Stalking', 4),
    (6, 'Financial Fraud', 1), (6, 'Money Laundering', 2),
    (7, 'Drug Possession', 1), (7, 'Drug Trafficking', 2),
    (8, 'Other Offences', 1)
ON CONFLICT DO NOTHING;

-- 14j. Court
CREATE TABLE IF NOT EXISTS Court (
    CourtID    SERIAL PRIMARY KEY,
    CourtName  VARCHAR(200) NOT NULL,
    DistrictID INT REFERENCES District(DistrictID),
    StateID    INT REFERENCES State(StateID),
    Active     BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO Court (CourtName, DistrictID, StateID, Active)
SELECT 'Principal District & Sessions Court', d.DistrictID, s.StateID, TRUE
FROM District d CROSS JOIN State s
WHERE s.StateName = 'Karnataka'
  AND d.DistrictName IN ('Bangalore Urban', 'Mysuru', 'Belgaum', 'Dharwad', 'Kalaburagi')
ON CONFLICT DO NOTHING;

-- 14k. Fix District — add missing columns
ALTER TABLE District
    ADD COLUMN IF NOT EXISTS StateID INT REFERENCES State(StateID),
    ADD COLUMN IF NOT EXISTS Active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE District SET StateID = (SELECT StateID FROM State WHERE StateName = 'Karnataka' LIMIT 1)
WHERE StateID IS NULL;

-- 14l. Fix Unit — add missing columns
ALTER TABLE Unit
    ADD COLUMN IF NOT EXISTS TypeID INT REFERENCES UnitType(UnitTypeID),
    ADD COLUMN IF NOT EXISTS ParentUnit INT REFERENCES Unit(UnitID),
    ADD COLUMN IF NOT EXISTS StateID INT REFERENCES State(StateID),
    ADD COLUMN IF NOT EXISTS NationalityID INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS Active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE Unit
SET TypeID = (SELECT UnitTypeID FROM UnitType WHERE UnitTypeName = 'Police Station' LIMIT 1),
    StateID = (SELECT StateID FROM State WHERE StateName = 'Karnataka' LIMIT 1)
WHERE TypeID IS NULL;

-- =============================================================
-- 15. Entity Tables (Phase 3a — ER Diagram compliance)
-- =============================================================

-- 15a. Employee
CREATE TABLE IF NOT EXISTS Employee (
    EmployeeID    SERIAL PRIMARY KEY,
    DistrictID    INT REFERENCES District(DistrictID),
    UnitID        INT REFERENCES Unit(UnitID),
    RankID        INT REFERENCES Rank(RankID),
    DesignationID INT REFERENCES Designation(DesignationID),
    KGID          VARCHAR(50) UNIQUE,
    FirstName     VARCHAR(100) NOT NULL,
    GenderID      INT DEFAULT 0
);

-- 15b. Victim (ER-compliant, linked to CaseMaster)
CREATE TABLE IF NOT EXISTS Victim (
    VictimMasterID SERIAL PRIMARY KEY,
    CaseMasterID   INT NOT NULL,
    CrimeRegisteredDate DATE NOT NULL,
    VictimName     VARCHAR(200),
    AgeYear        INT,
    GenderID       INT DEFAULT 0,
    VictimPolice   BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (CaseMasterID, CrimeRegisteredDate)
        REFERENCES CaseMaster(CaseMasterID, CrimeRegisteredDate)
);

-- 15c. ComplainantDetails
CREATE TABLE IF NOT EXISTS ComplainantDetails (
    ComplainantID   SERIAL PRIMARY KEY,
    CaseMasterID    INT NOT NULL,
    CrimeRegisteredDate DATE NOT NULL,
    ComplainantName VARCHAR(200),
    AgeYear         INT,
    GenderID        INT DEFAULT 0,
    FOREIGN KEY (CaseMasterID, CrimeRegisteredDate)
        REFERENCES CaseMaster(CaseMasterID, CrimeRegisteredDate)
);

-- 15d. Fix ArrestSurrender — add missing columns
ALTER TABLE ArrestSurrender
    ADD COLUMN IF NOT EXISTS ArrestSurrenderTypeID INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS ArrestSurrenderDate DATE,
    ADD COLUMN IF NOT EXISTS ArrestSurrenderStateId INT REFERENCES State(StateID),
    ADD COLUMN IF NOT EXISTS ArrestSurrenderDistrictId INT REFERENCES District(DistrictID),
    ADD COLUMN IF NOT EXISTS IOID INT REFERENCES Employee(EmployeeID),
    ADD COLUMN IF NOT EXISTS CourtID INT REFERENCES Court(CourtID),
    ADD COLUMN IF NOT EXISTS AccusedMasterID INT REFERENCES Accused(AccusedMasterID),
    ADD COLUMN IF NOT EXISTS IsAccused BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS IsComplainantAccused BOOLEAN DEFAULT FALSE;

-- 15e. Fix Accused — add missing columns
ALTER TABLE Accused
    ADD COLUMN IF NOT EXISTS CaseMasterID INT,
    ADD COLUMN IF NOT EXISTS AgeYear INT,
    ADD COLUMN IF NOT EXISTS GenderID INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS PersonID VARCHAR(10);

CREATE UNIQUE INDEX IF NOT EXISTS idx_casemaster_id ON CaseMaster(CaseMasterID);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'accused_casemasterid_fkey') THEN
        EXECUTE 'ALTER TABLE Accused ADD CONSTRAINT accused_casemasterid_fkey
            FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID)';
    END IF;
END $$;

-- 15f. ActSectionAssociation
CREATE TABLE IF NOT EXISTS ActSectionAssociation (
    CaseMasterID    INT NOT NULL,
    ActID           VARCHAR(20) NOT NULL REFERENCES Act(ActCode),
    SectionID       VARCHAR(20) NOT NULL,
    ActOrderID      INT DEFAULT 1,
    SectionOrderID  INT DEFAULT 1,
    PRIMARY KEY (CaseMasterID, ActID, SectionID),
    FOREIGN KEY (ActID, SectionID) REFERENCES Section(ActCode, SectionCode)
);

-- 15g. CrimeHeadActSection
CREATE TABLE IF NOT EXISTS CrimeHeadActSection (
    CrimeHeadID INT NOT NULL REFERENCES CrimeHead(CrimeHeadID),
    ActCode     VARCHAR(20) NOT NULL REFERENCES Act(ActCode),
    SectionCode VARCHAR(20) NOT NULL,
    PRIMARY KEY (CrimeHeadID, ActCode, SectionCode),
    FOREIGN KEY (ActCode, SectionCode) REFERENCES Section(ActCode, SectionCode)
);

-- 15h. ChargesheetDetails
CREATE TABLE IF NOT EXISTS ChargesheetDetails (
    CSID            SERIAL PRIMARY KEY,
    CaseMasterID    INT NOT NULL,
    CrimeRegisteredDate DATE NOT NULL,
    csdate          TIMESTAMP,
    cstype          CHAR(1) DEFAULT 'A',
    PolicePersonID  INT REFERENCES Employee(EmployeeID),
    FOREIGN KEY (CaseMasterID, CrimeRegisteredDate)
        REFERENCES CaseMaster(CaseMasterID, CrimeRegisteredDate)
);

-- =============================================================
-- 16. CaseMaster FK Enforcement
-- =============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_unit') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_unit FOREIGN KEY (PoliceStationID) REFERENCES Unit(UnitID)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'policepersonid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_employee') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_employee FOREIGN KEY (PolicePersonID) REFERENCES Employee(EmployeeID)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'casecategoryid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_category') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_category FOREIGN KEY (CaseCategoryID) REFERENCES CaseCategory(CaseCategoryID)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'gravityoffenceid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_gravity') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_gravity FOREIGN KEY (GravityOffenceID) REFERENCES GravityOffence(GravityOffenceID)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'crimemajorheadid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_crimehead') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_crimehead FOREIGN KEY (CrimeMajorHeadID) REFERENCES CrimeHead(CrimeHeadID)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'crimeminorheadid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_crimesubhead') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_crimesubhead FOREIGN KEY (CrimeMinorHeadID) REFERENCES CrimeSubHead(CrimeSubHeadID)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'casestatusid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_status') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_status FOREIGN KEY (CaseStatusID) REFERENCES CaseStatusMaster(CaseStatusID)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'courtid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_court') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_court FOREIGN KEY (CourtID) REFERENCES Court(CourtID)';
    END IF;
END $$;

-- =============================================================
-- 18. Cybercrime data model (Phase 6a)
-- =============================================================

-- 18a. Cybercrime indicators (one-to-many from CaseMaster)
CREATE TABLE IF NOT EXISTS cyber_indicators (
    indicator_id    SERIAL          PRIMARY KEY,
    casemasterid    INTEGER         NOT NULL REFERENCES casemaster(casemasterid) ON DELETE CASCADE,
    indicator_type  VARCHAR(50)     NOT NULL
        CHECK (indicator_type IN (
            'ip', 'domain', 'wallet', 'phone', 'bank_account',
            'social_handle', 'email', 'upi_id', 'device_id'
        )),
    indicator_value VARCHAR(500)    NOT NULL,
    platform        VARCHAR(100),
    extracted_from  TEXT,
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

-- 18b. OSINT enrichment cache
CREATE TABLE IF NOT EXISTS osint_cache (
    cache_id        SERIAL          PRIMARY KEY,
    entity_type     VARCHAR(50)     NOT NULL,
    entity_value    VARCHAR(500)    NOT NULL,
    source          VARCHAR(100)    NOT NULL,
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

-- 18c. Cyber trend alerts (pre-computed patterns)
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

-- 18d. Extend CaseMaster with aggregate cybercrime fields
ALTER TABLE casemaster ADD COLUMN IF NOT EXISTS is_cybercrime    BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE casemaster ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(100);
ALTER TABLE casemaster ADD COLUMN IF NOT EXISTS financial_loss   NUMERIC(15, 2);
ALTER TABLE casemaster ADD COLUMN IF NOT EXISTS cyber_severity   VARCHAR(20)
    CHECK (cyber_severity IN ('low', 'medium', 'high', 'critical'));

-- =============================================================
-- 19. Indexes for query performance
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_fir_district    ON fir_records(district_code, incident_ts DESC);
CREATE INDEX IF NOT EXISTS idx_fir_crime_type  ON fir_records(crime_type, incident_ts DESC);
CREATE INDEX IF NOT EXISTS idx_fir_geo        ON fir_records(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_offender_risk   ON offenders(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_offender_last_ts ON offenders(last_offense_ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_officer   ON audit_log(officer_id, logged_at DESC);

-- =============================================================
-- 15. Principle of Least Privilege — read-only role
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

-- =============================================================================
