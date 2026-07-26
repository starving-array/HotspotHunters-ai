package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.FirRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface FirRecordRepository extends JpaRepository<FirRecord, String> {
    List<FirRecord> findByDistrictCodeAndIncidentTsBetween(String districtCode, Instant start, Instant end);
    List<FirRecord> findByDistrictCodeInAndIncidentTsBetween(List<String> districtCodes, Instant start, Instant end);

    // -- CATALYST: PostgreSQL full-text search methods (replaces ElasticSearch) --
    /*
    @Query(value = """
        SELECT f FROM FirRecord f
        WHERE f.searchVector @@ to_tsquery('english', :query)
        ORDER BY ts_rank(f.searchVector, to_tsquery('english', :query)) DESC
        """)
    List<FirRecord> searchByFullText(@Param("query") String query, Pageable pageable);

    @Query(value = """
        SELECT f FROM FirRecord f
        WHERE f.districtCode = :districtCode
          AND f.searchVector @@ to_tsquery('english', :query)
        ORDER BY ts_rank(f.searchVector, to_tsquery('english', :query)) DESC
        """)
    List<FirRecord> searchByFullTextAndDistrict(@Param("districtCode") String districtCode,
                                                 @Param("query") String query,
                                                 Pageable pageable);

    @Query(value = """
        SELECT f.*, earth_distance(
            ll_to_earth(f.latitude, f.longitude),
            ll_to_earth(:lat, :lon)
        ) AS distance
        FROM fir_records f
        WHERE earth_distance(
            ll_to_earth(f.latitude, f.longitude),
            ll_to_earth(:lat, :lon)
        ) <= :radiusMeters
        ORDER BY distance
        """, nativeQuery = true)
    List<Object[]> searchByGeoDistance(@Param("lat") Double lat,
                                        @Param("lon") Double lon,
                                        @Param("radiusMeters") Double radius);
    */
}