package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.FirSearchResultDto;
import com.ksp.intelligence.service.FirSearchService;
import jakarta.persistence.EntityManager;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Catalyst-compatible search controller using PostgreSQL full-text and ILIKE search.
 * Replaces the ElasticSearch-based SearchController.
 */
@RestController
public class PgSearchController {

    private final FirSearchService firSearchService;
    private final EntityManager em;

    public PgSearchController(FirSearchService firSearchService, EntityManager em) {
        this.firSearchService = firSearchService;
        this.em = em;
    }

    @GetMapping(value = "/api/v1/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> search(@RequestParam(value = "q", required = false) String q,
                                      @RequestParam(value = "lat", required = false) Double lat,
                                      @RequestParam(value = "lon", required = false) Double lon,
                                      @RequestParam(value = "radiusKm", defaultValue = "5") Double radiusKm) {

        List<FirSearchResultDto> results;

        if (lat != null && lon != null) {
            // Geo search using PostgreSQL earthdistance
            results = searchGeoWithText(q, lat, lon, radiusKm);
        } else {
            // Text search only
            results = firSearchService.search(q);
        }

        return Map.of(
            "totalHits", results.size(),
            "hits", results
        );
    }

    @GetMapping(value = "/api/v1/search/geo", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> searchGeo(@RequestParam Double lat,
                                         @RequestParam Double lon,
                                         @RequestParam(defaultValue = "5") Double radius) {
        return search(null, lat, lon, radius);
    }

    @GetMapping(value = "/api/v1/search/fulltext", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> searchFulltext(@RequestParam String q) {
        return search(q, null, null, null);
    }

    @SuppressWarnings("unchecked")
    private List<FirSearchResultDto> searchGeoWithText(String query, Double lat, Double lon, Double radiusKm) {
        if ((lat != null || lon != null) && (lat == null || lon == null)) {
            throw new IllegalArgumentException("Both lat and lon must be provided together for geo filtering.");
        }

        double radiusMeters = radiusKm * 1000;

        StringBuilder sql = new StringBuilder(
            "SELECT c.casemasterid, c.crimeno, " +
            "CASE WHEN c.is_cybercrime THEN 'Cyber Crime' ELSE 'Other' END AS crime_type, " +
            "COALESCE(d.districtname, 'Unknown') AS district, " +
            "COALESCE(u.stationname, 'Unknown') AS station, " +
            "TO_CHAR(c.crimeregistereddate, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS regdate, " +
            "COALESCE(LEFT(c.brieffacts, 200), '') AS facts, " +
            "COALESCE(c.cyber_severity, 'low') AS severity, " +
            "earth_distance(ll_to_earth(c.latitude, c.longitude), ll_to_earth(:lat, :lon)) AS distance " +
            "FROM casemaster c " +
            "LEFT JOIN unit u ON u.unitid = c.policestationid " +
            "LEFT JOIN district d ON d.districtid = u.districtid " +
            "WHERE earth_distance(ll_to_earth(c.latitude, c.longitude), ll_to_earth(:lat, :lon)) <= :radius "
        );

        if (query != null && !query.isBlank()) {
            sql.append("AND (c.crimeno ILIKE :q OR c.brieffacts ILIKE :q OR d.districtname ILIKE :q) ");
        }
        sql.append("ORDER BY distance LIMIT 50");

        var q = em.createNativeQuery(sql.toString());
        q.setParameter("lat", lat);
        q.setParameter("lon", lon);
        q.setParameter("radius", radiusMeters);

        if (query != null && !query.isBlank()) {
            q.setParameter("q", "%" + query + "%");
        }

        List<FirSearchResultDto> results = new ArrayList<>();
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            results.add(FirSearchResultDto.builder()
                    .caseMasterId(row[0] != null ? ((Number) row[0]).intValue() : 0)
                    .crimeNo((String) row[1])
                    .crimeType((String) row[2])
                    .district((String) row[3])
                    .policeStation((String) row[4])
                    .registeredDate((String) row[5])
                    .briefFacts((String) row[6])
                    .severity((String) row[7])
                    .build());
        }
        return results;
    }
}