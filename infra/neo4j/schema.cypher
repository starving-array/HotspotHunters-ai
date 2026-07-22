// Case
CREATE CONSTRAINT IF NOT EXISTS FOR (c:Case) REQUIRE c.caseMasterId IS UNIQUE;

// Person (accused, victim, complainant)
CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.globalId IS UNIQUE;

// PoliceOfficer
CREATE CONSTRAINT IF NOT EXISTS FOR (o:PoliceOfficer) REQUIRE o.employeeId IS UNIQUE;

// PoliceStation (Unit)
CREATE CONSTRAINT IF NOT EXISTS FOR (s:PoliceStation) REQUIRE s.unitId IS UNIQUE;

// CrimeCategory (CrimeHead)
CREATE CONSTRAINT IF NOT EXISTS FOR (cc:CrimeCategory) REQUIRE cc.crimeHeadId IS UNIQUE;

// CrimeSubCategory (CrimeSubHead)
CREATE CONSTRAINT IF NOT EXISTS FOR (sc:CrimeSubCategory) REQUIRE sc.crimeSubHeadId IS UNIQUE;

// District
CREATE CONSTRAINT IF NOT EXISTS FOR (d:District) REQUIRE d.districtId IS UNIQUE;

// CyberIndicator
CREATE CONSTRAINT IF NOT EXISTS FOR (ci:CyberIndicator) REQUIRE ci.indicatorId IS UNIQUE;

// Indices for fast lookups
CREATE INDEX IF NOT EXISTS FOR (c:Case) ON (c.crimeNo);
CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.sourceTable);
CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.name);
CREATE INDEX IF NOT EXISTS FOR (s:PoliceStation) ON (s.stationCode);
CREATE INDEX IF NOT EXISTS FOR (cc:CrimeCategory) ON (cc.crimeGroupName);
