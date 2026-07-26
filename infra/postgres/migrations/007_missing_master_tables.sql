-- =============================================================================
-- Phase 3a (completion): Missing master lookup tables for ComplainantDetails.
-- CasteMaster, ReligionMaster, OccupationMaster were defined in the ER diagram
-- (KSP_Complete_Schema_Fix.md) but never deployed. This migration creates them
-- and wires the deferred FK columns on ComplainantDetails.
-- =============================================================================

-- 1. OccupationMaster
CREATE TABLE IF NOT EXISTS OccupationMaster (
    OccupationID   SERIAL PRIMARY KEY,
    OccupationName VARCHAR(100) NOT NULL
);

INSERT INTO OccupationMaster (OccupationID, OccupationName) VALUES
    (1,  'Farmer'),
    (2,  'Government Employee'),
    (3,  'Private Employee'),
    (4,  'Business'),
    (5,  'Student'),
    (6,  'Labour'),
    (7,  'Driver'),
    (8,  'Housewife'),
    (9,  'Retired'),
    (10, 'Other')
ON CONFLICT (OccupationID) DO NOTHING;

-- 2. ReligionMaster
CREATE TABLE IF NOT EXISTS ReligionMaster (
    ReligionID   SERIAL PRIMARY KEY,
    ReligionName VARCHAR(100) NOT NULL
);

INSERT INTO ReligionMaster (ReligionID, ReligionName) VALUES
    (1, 'Hindu'),
    (2, 'Muslim'),
    (3, 'Christian'),
    (4, 'Jain'),
    (5, 'Buddhist'),
    (6, 'Sikh'),
    (7, 'Other')
ON CONFLICT (ReligionID) DO NOTHING;

-- 3. CasteMaster (note: non-standard snake_case PK to match original ER doc)
CREATE TABLE IF NOT EXISTS CasteMaster (
    caste_master_id   SERIAL PRIMARY KEY,
    caste_master_name VARCHAR(100) NOT NULL
);

INSERT INTO CasteMaster (caste_master_id, caste_master_name) VALUES
    (1, 'SC'),
    (2, 'ST'),
    (3, 'OBC'),
    (4, 'General'),
    (5, 'Vokkaliga'),
    (6, 'Lingayat'),
    (7, 'Kuruba'),
    (8, 'Other')
ON CONFLICT (caste_master_id) DO NOTHING;

-- 4. Wire the deferred FK columns on ComplainantDetails
ALTER TABLE ComplainantDetails
    ADD COLUMN IF NOT EXISTS CasteID     INT REFERENCES CasteMaster(caste_master_id),
    ADD COLUMN IF NOT EXISTS ReligionID  INT REFERENCES ReligionMaster(ReligionID),
    ADD COLUMN IF NOT EXISTS OccupationID INT REFERENCES OccupationMaster(OccupationID);
