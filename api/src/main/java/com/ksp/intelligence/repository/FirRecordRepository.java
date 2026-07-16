package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.FirRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data JPA repo for {@link FirRecord}. Used by IndexingConsumer (Phase 2). */
@Repository
public interface FirRecordRepository extends JpaRepository<FirRecord, String> {
    // Default CRUD methods suffice for the indexing consumer:
    //   save(s)         — upsert (idempotent on fir_id PK)
    //   existsById(id)  — pre-flight check (optional)
    //   count()         — used by actuator health/info endpoints
}
