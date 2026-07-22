-- =============================================================================
-- KSP Intelligence Portal — Migration 005: CaseMaster FK Enforcement
-- Adds foreign key constraints from CaseMaster to all lookup/entity tables
-- =============================================================================

-- Helper: add FK only if the referencing column exists and constraint doesn't
DO $$
DECLARE
    fk_cursor CURSOR FOR
        SELECT
            conname
        FROM pg_constraint
        WHERE conrelid = 'casemaster'::regclass;
    fk_exists BOOLEAN;
BEGIN
    -- PoliceStationID → Unit
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_unit') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_unit FOREIGN KEY (PoliceStationID) REFERENCES Unit(UnitID)';
    END IF;

    -- PolicePersonID → Employee
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'policepersonid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_employee') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_employee FOREIGN KEY (PolicePersonID) REFERENCES Employee(EmployeeID)';
    END IF;

    -- CaseCategoryID → CaseCategory
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'casecategoryid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_category') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_category FOREIGN KEY (CaseCategoryID) REFERENCES CaseCategory(CaseCategoryID)';
    END IF;

    -- GravityOffenceID → GravityOffence
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'gravityoffenceid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_gravity') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_gravity FOREIGN KEY (GravityOffenceID) REFERENCES GravityOffence(GravityOffenceID)';
    END IF;

    -- CrimeMajorHeadID → CrimeHead
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'crimemajorheadid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_crimehead') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_crimehead FOREIGN KEY (CrimeMajorHeadID) REFERENCES CrimeHead(CrimeHeadID)';
    END IF;

    -- CrimeMinorHeadID → CrimeSubHead
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'crimeminorheadid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_crimesubhead') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_crimesubhead FOREIGN KEY (CrimeMinorHeadID) REFERENCES CrimeSubHead(CrimeSubHeadID)';
    END IF;

    -- CaseStatusID → CaseStatusMaster
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'casestatusid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_status') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_status FOREIGN KEY (CaseStatusID) REFERENCES CaseStatusMaster(CaseStatusID)';
    END IF;

    -- CourtID → Court
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casemaster' AND column_name = 'courtid')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'casemaster'::regclass AND conname = 'fk_casemaster_court') THEN
        EXECUTE 'ALTER TABLE CaseMaster ADD CONSTRAINT fk_casemaster_court FOREIGN KEY (CourtID) REFERENCES Court(CourtID)';
    END IF;
END $$;
