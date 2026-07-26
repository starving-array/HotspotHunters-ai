package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.FirRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;

public interface FirRecordRepository extends JpaRepository<FirRecord, String> {
    List<FirRecord> findByDistrictCodeAndIncidentTsBetween(String districtCode, Instant start, Instant end);
    List<FirRecord> findByDistrictCodeInAndIncidentTsBetween(List<String> districtCodes, Instant start, Instant end);
}