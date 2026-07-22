-- =============================================================================
-- KSP Intelligence Portal — Migration 002: Lookup Tables
-- Creates 10 missing lookup tables, fixes District/Unit columns
-- =============================================================================

-- =============================================================
-- 1. State
-- =============================================================
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

-- =============================================================
-- 2. UnitType
-- =============================================================
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

-- =============================================================
-- 3. Rank
-- =============================================================
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

-- =============================================================
-- 4. Designation
-- =============================================================
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

-- =============================================================
-- 5. CrimeHead (Major crime heads)
-- =============================================================
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

-- =============================================================
-- 6. CrimeSubHead (Minor crime sub-heads)
-- =============================================================
CREATE TABLE IF NOT EXISTS CrimeSubHead (
    CrimeSubHeadID SERIAL PRIMARY KEY,
    CrimeHeadID    INT NOT NULL REFERENCES CrimeHead(CrimeHeadID),
    CrimeHeadName  VARCHAR(200) NOT NULL,
    SeqID          INT DEFAULT 0
);

INSERT INTO CrimeSubHead (CrimeHeadID, CrimeHeadName, SeqID) VALUES
    (1, 'Murder', 1),
    (1, 'Attempt to Murder', 2),
    (1, 'Assault', 3),
    (1, 'Grievous Hurt', 4),
    (2, 'Robbery', 1),
    (2, 'Burglary', 2),
    (2, 'Theft', 3),
    (2, 'Property Crime', 4),
    (3, 'Rape', 1),
    (3, 'Sexual Harassment', 2),
    (3, 'Dowry Death', 3),
    (4, 'Child Labour', 1),
    (4, 'Child Marriage', 2),
    (5, 'Identity Theft', 1),
    (5, 'Cyber Fraud', 2),
    (5, 'Phishing', 3),
    (5, 'Cyber Stalking', 4),
    (6, 'Financial Fraud', 1),
    (6, 'Money Laundering', 2),
    (7, 'Drug Possession', 1),
    (7, 'Drug Trafficking', 2),
    (8, 'Other Offences', 1)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 7. CaseCategory (FIR, UDR, PAR, Zero FIR)
-- =============================================================
CREATE TABLE IF NOT EXISTS CaseCategory (
    CaseCategoryID SERIAL PRIMARY KEY,
    LookupValue    VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO CaseCategory (LookupValue) VALUES
    ('FIR'),
    ('UDR'),
    ('PAR'),
    ('Zero FIR')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 8. GravityOffence (Heinous, Non-Heinous)
-- =============================================================
CREATE TABLE IF NOT EXISTS GravityOffence (
    GravityOffenceID SERIAL PRIMARY KEY,
    LookupValue      VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO GravityOffence (LookupValue) VALUES
    ('Heinous'),
    ('Non-Heinous')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 9. CaseStatusMaster
-- =============================================================
CREATE TABLE IF NOT EXISTS CaseStatusMaster (
    CaseStatusID   SERIAL PRIMARY KEY,
    CaseStatusName VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO CaseStatusMaster (CaseStatusName) VALUES
    ('Under Investigation'),
    ('Charge Sheeted'),
    ('Closed'),
    ('Transferred'),
    ('Pending Court')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 10. Court
-- =============================================================
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

-- =============================================================
-- 11. Fix District — add StateID + Active
-- =============================================================
ALTER TABLE District
    ADD COLUMN IF NOT EXISTS StateID INT REFERENCES State(StateID),
    ADD COLUMN IF NOT EXISTS Active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE District SET StateID = (SELECT StateID FROM State WHERE StateName = 'Karnataka' LIMIT 1)
WHERE StateID IS NULL;

-- =============================================================
-- 12. Fix Unit — add TypeID, ParentUnit, StateID, NationalityID, Active
-- =============================================================
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
