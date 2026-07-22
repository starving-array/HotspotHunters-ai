-- =============================================================================
-- KSP Intelligence Portal — Migration 003: Entity Tables
-- Creates Employee, Victim, ComplainantDetails, ActSectionAssociation,
-- CrimeHeadActSection, ChargesheetDetails
-- =============================================================================

-- =============================================================
-- 1. Employee (minimal — PII-slim per design decision)
-- =============================================================
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

INSERT INTO Employee (FirstName, UnitID, DistrictID, RankID, DesignationID)
SELECT
    CONCAT('Officer_', u.StationCode),
    u.UnitID,
    u.DistrictID,
    (SELECT RankID FROM Rank WHERE RankName = 'Inspector' LIMIT 1),
    (SELECT DesignationID FROM Designation WHERE DesignationName = 'Investigating Officer' LIMIT 1)
FROM Unit u
WHERE NOT EXISTS (SELECT 1 FROM Employee e WHERE e.UnitID = u.UnitID)
LIMIT 50;

-- =============================================================
-- 2. Victim (ER-compliant, linked to CaseMaster)
--     Keeps existing victims table for ML pipeline unchanged
-- =============================================================
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

-- Seed Victim from existing case records
INSERT INTO Victim (CaseMasterID, CrimeRegisteredDate, VictimName)
SELECT cm.CaseMasterID, cm.CrimeRegisteredDate,
       CONCAT('Victim_', cm.CaseMasterID)
FROM CaseMaster cm
WHERE NOT EXISTS (SELECT 1 FROM Victim v WHERE v.CaseMasterID = cm.CaseMasterID)
LIMIT 1000;

-- =============================================================
-- 3. ComplainantDetails (without caste/religion/occupation FKs — deferred)
-- =============================================================
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

INSERT INTO ComplainantDetails (CaseMasterID, CrimeRegisteredDate, ComplainantName)
SELECT cm.CaseMasterID, cm.CrimeRegisteredDate,
       CONCAT('Complainant_', cm.CaseMasterID)
FROM CaseMaster cm
WHERE NOT EXISTS (SELECT 1 FROM ComplainantDetails cd WHERE cd.CaseMasterID = cm.CaseMasterID)
LIMIT 1000;

-- =============================================================
-- 4. ActSectionAssociation (junction: CaseMaster ↔ Act ↔ Section)
-- =============================================================
CREATE TABLE IF NOT EXISTS ActSectionAssociation (
    CaseMasterID    INT NOT NULL,
    ActID           VARCHAR(20) NOT NULL REFERENCES Act(ActCode),
    SectionID       VARCHAR(20) NOT NULL,
    ActOrderID      INT DEFAULT 1,
    SectionOrderID  INT DEFAULT 1,
    PRIMARY KEY (CaseMasterID, ActID, SectionID),
    FOREIGN KEY (ActID, SectionID) REFERENCES Section(ActCode, SectionCode)
);

-- Seed from existing casemaster — assign IPC 406 to every case as default
INSERT INTO ActSectionAssociation (CaseMasterID, ActID, SectionID)
SELECT cm.CaseMasterID, 'IPC', '406'
FROM CaseMaster cm
WHERE NOT EXISTS (
    SELECT 1 FROM ActSectionAssociation a
    WHERE a.CaseMasterID = cm.CaseMasterID AND a.ActID = 'IPC' AND a.SectionID = '406'
);

-- Add IPC Sections needed for CrimeHeadActSection BEFORE creating the junction
INSERT INTO Section (ActCode, SectionCode, SectionDescription, Active) VALUES
    ('IPC', '302', 'Punishment for murder', TRUE),
    ('IPC', '307', 'Attempt to murder', TRUE),
    ('IPC', '392', 'Robbery', TRUE),
    ('IPC', '395', 'Dacoity', TRUE),
    ('IPC', '376', 'Punishment for rape', TRUE),
    ('IPC', '354', 'Assault or criminal force to woman', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 5. CrimeHeadActSection (junction: CrimeHead ↔ Act ↔ Section)
-- =============================================================
CREATE TABLE IF NOT EXISTS CrimeHeadActSection (
    CrimeHeadID INT NOT NULL REFERENCES CrimeHead(CrimeHeadID),
    ActCode     VARCHAR(20) NOT NULL REFERENCES Act(ActCode),
    SectionCode VARCHAR(20) NOT NULL,
    PRIMARY KEY (CrimeHeadID, ActCode, SectionCode),
    FOREIGN KEY (ActCode, SectionCode) REFERENCES Section(ActCode, SectionCode)
);

-- Ensure NDPS Act exists
INSERT INTO Act (ActCode, ActDescription, ShortName, Active)
VALUES ('NDPS', 'Narcotic Drugs and Psychotropic Substances Act', 'NDPS', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO Section (ActCode, SectionCode, SectionDescription, Active) VALUES
    ('NDPS', '20', 'Punishment for cultivation of cannabis', TRUE),
    ('NDPS', '21', 'Punishment for manufacture, possession of psychotropic substances', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO CrimeHeadActSection (CrimeHeadID, ActCode, SectionCode) VALUES
    (5, 'IT_ACT', '66C'),
    (5, 'IT_ACT', '66D'),
    (7, 'NDPS', '20'),
    (7, 'NDPS', '21')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 6. ChargesheetDetails
-- =============================================================
CREATE TABLE IF NOT EXISTS ChargesheetDetails (
    CSID            SERIAL PRIMARY KEY,
    CaseMasterID    INT NOT NULL,
    CrimeRegisteredDate DATE NOT NULL,
    csdate          TIMESTAMP,
    cstype          CHAR(1) DEFAULT 'A',  -- A=Chargesheet, B=False Case, C=Undetected
    PolicePersonID  INT REFERENCES Employee(EmployeeID),
    FOREIGN KEY (CaseMasterID, CrimeRegisteredDate)
        REFERENCES CaseMaster(CaseMasterID, CrimeRegisteredDate)
);
