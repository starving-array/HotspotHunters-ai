-- =============================================================================
-- KSP Intelligence Portal — Migration 004: Fix Incomplete Tables
-- Adds missing columns to ArrestSurrender and Accused per ER diagram
-- =============================================================================

-- =============================================================
-- 1. Fix ArrestSurrender — add missing columns
-- =============================================================

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

-- Rename ArrestDate → ArrestSurrenderDate for ER consistency
-- (keep old column as alias if it has data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'arrestsurrender' AND column_name = 'arrestdate')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'arrestsurrender' AND column_name = 'arrestsurrenderdate') THEN
        UPDATE ArrestSurrender SET ArrestSurrenderDate = ArrestDate
        WHERE ArrestSurrenderDate IS NULL AND ArrestDate IS NOT NULL;
    END IF;
END $$;

-- =============================================================
-- 2. Fix Accused — add missing columns, link to CaseMaster
-- =============================================================

ALTER TABLE Accused
    ADD COLUMN IF NOT EXISTS CaseMasterID INT,
    ADD COLUMN IF NOT EXISTS AgeYear INT,
    ADD COLUMN IF NOT EXISTS GenderID INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS PersonID VARCHAR(10);

-- Ensure single-column unique index exists on CaseMasterID for FK targeting
CREATE UNIQUE INDEX IF NOT EXISTS idx_casemaster_id ON CaseMaster(CaseMasterID);

-- Add FK after column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'accused_casemasterid_fkey') THEN
        EXECUTE 'ALTER TABLE Accused ADD CONSTRAINT accused_casemasterid_fkey
            FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID)';
    END IF;
END $$;
