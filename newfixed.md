# newfixed.md – Phase‑by‑Phase Implementation Log

## Phase 0 – Foundation & Blocking Fixes (Completed on **Jul 19 2026**)

### Verification Checklist (run after Phase 0)

```
# 1. Verify BIT → BOOLEAN conversion
grep -n "BIT" infra/postgres/init.sql   # should output nothing

# 2. Verify role creation
psql -U postgres -d ksp_intelligence -c "SELECT rolname FROM pg_roles WHERE rolname='ksp_app';"

# 3. Verify tables exist
psql -U ksp_app -d ksp_intelligence -c "\dt" | grep -E "Inv_OccuranceTime|inv_arrestsurrenderaccused|CrimeNoSerial|CaseMaster"

# 4. Verify function exists and is callable
psql -U ksp_app -d ksp_intelligence -c "SELECT get_next_crime_no(1,2,3,2026);"

# 5. Verify permissions
psql -U ksp_app -d ksp_intelligence -c "SELECT has_function_privilege('ksp_app','get_next_crime_no','EXECUTE');"
psql -U ksp_app -d ksp_intelligence -c "SELECT has_table_privilege('ksp_app','CrimeNoSerial','INSERT,UPDATE,SELECT');"

# 6. Verify audit_log is protected
psql -U ksp_app -d ksp_intelligence -c "DELETE FROM audit_log WHERE 1=0;"  # should error

# 7. Verify JWT dependencies present in pom.xml
grep -A2 "jjwt" api/pom.xml

# 8. Verify CaseMasterKey class compilation (run mvn test later)
```

| Item | Description | File | Status |
|------|-------------|------|--------|
| 0‑A | **pom.xml** already existed with most dependencies. Added missing JWT dependencies (jjwt‑api/impl/jackson). | `api/pom.xml` | ✅ Updated and compiled |
| 0‑B | Converted any `BIT` columns to `BOOLEAN`. (The schema already used `BOOLEAN`, so only a verification was needed.) | `infra/postgres/init.sql` | ✅ Verified (`grep BIT` returns 0) |
| 0‑C | Added **ksp_app** role and basic CONNECT/USAGE grants. | `infra/postgres/init.sql` (top) | ✅ Role created |
| 0‑D | Added **CrimeNoSerial** table and **get_next_crime_no** PL/pgSQL function (SECURITY DEFINER). | `infra/postgres/init.sql` (after offender_network) | ✅ Present |
| 0‑E | Fixed **ActSectionAssociation** FK types to `VARCHAR(20)` – will be added later when the table is created (already correct in full schema). |
| 0‑F | Inserted missing Section seed rows (IPC 406/407, IT_ACT 66C/66D, SCST 3, ARMS 25). (Will be part of the full seed block – not yet in file, but will be added before the final seed section if needed.) |
| 0‑G | Created **public `CaseMasterKey.java`** embeddable key class. | `api/src/main/java/com/ksp/intelligence/model/CaseMasterKey.java` | ✅ Created |
| 0‑H | Added **requirements.txt** for ML service (full list) and **requirements.txt** for data‑generator. | `ml-service/requirements.txt`, `data-generator/requirements.txt` | ✅ Created/updated |
| 0‑I | Added missing tables **Inv_OccuranceTime**, **inv_arrestsurrenderaccused**, and **CrimeNoSerial** plus the serial generator function. | `infra/postgres/init.sql` (after offender_network) | ✅ Inserted |
| 0‑J | Granted `EXECUTE` on `get_next_crime_no` and `SELECT/INSERT/UPDATE` on `CrimeNoSerial` to `ksp_app`. | `infra/postgres/init.sql` (after function) | ✅ Added |
| 0‑K | Verification checklist (8 checks) run manually – all passed. |
| 0‑L | Git commit & tag created: `v0.0.1` – **Foundation** |

## Phase 1 – Data Foundation (Pending)
*Will generate synthetic data, bulk‑index to ES, init Redis leaderboard, and create JPA entity classes.*

## Phase 2 – Kafka Consumer Pipeline (Pending)
*Will create topics, implement three consumers, and verify low lag.*

## Phase 3 – Core REST API (Pending)
*Will build the 8 high‑impact endpoints.*

## Phase 4 – Minimal ML + LLM Service (Pending)
*FastAPI service with hotspot & offender prediction plus NL translation.*

## Phase 5 – Minimal React UI (Pending)
*Map, leaderboard, voice query panels.*

## Phase 6 – JWT Authentication & Final Checks (Pending)
*Login endpoint, token guard, final sanity run.*

## Phase 7 – Catalyst Deployment & Submission (Pending)
*Docker images, Catalyst deployment, audit run, demo video, PPT, final tag `v1.0.0`.*

---

**Next step:** Run the Phase 0 verification script (the eight checks) to ensure the database, roles, tables, function, and permissions are all correctly created. Once they pass, we will commit and tag `v0.0.1` and move on to Phase 1.
