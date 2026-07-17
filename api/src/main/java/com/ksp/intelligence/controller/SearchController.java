package com.ksp.intelligence.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.query.Query;
import org.springframework.data.elasticsearch.core.query.NativeSearchQueryBuilder;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.common.unit.DistanceUnit;
import org.springframework.data.elasticsearch.core.query.StringQuery;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class SearchController {

    private final ElasticsearchOperations esOps;

    @Value("${ksp.elasticsearch.crime-index:crime-index}")
    private String crimeIndex;

    public SearchController(ElasticsearchOperations esOps) {
        this.esOps = esOps;
    }

    /**
     * Full‑text and optional geo search over FIR records.
     *
     * @param q optional keyword query (matches across crime_type, modus_operandi, etc.)
+     * @param lat optional latitude for geo filter
+     * @param lon optional longitude for geo filter
+     * @param radiusKm optional radius in km (default 5 km)
+     * @return up to 20 matching documents as raw maps
+     */
    @GetMapping(value = "/api/v1/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<Map<String, Object>> search(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lon", required = false) Double lon,
            @RequestParam(value = "radiusKm", defaultValue = "5") Double radiusKm) {

        // Validate geo parameters when any are supplied.
        if ((lat != null || lon != null) && (lat == null || lon == null)) {
            throw new IllegalArgumentException("Both lat and lon must be provided together for geo filtering.");
        }
        if (lat != null && (lat < -90.0 || lat > 90.0)) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90.");
        }
        if (lon != null && (lon < -180.0 || lon > 180.0)) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180.");
        }
        if (radiusKm <= 0) {
            throw new IllegalArgumentException("radiusKm must be > 0.");
        }

        // Build the base query – match all if no keyword.
        String queryString = (q != null && !q.isBlank()) ? q : "*:*";
        // Base query using query_string query to support simple syntax.
        QueryBuilder baseQueryBuilder = QueryBuilders.queryStringQuery(queryString);

        // If geo filter is supplied, combine with geo_distance.
        if (lat != null && lon != null) {
            QueryBuilder geoBuilder = QueryBuilders
                    .geoDistanceQuery("location") // field name assumed "location"
                    .point(lat, lon)
                    .distance(radiusKm, DistanceUnit.KILOMETERS);
            QueryBuilder combined = QueryBuilders.boolQuery()
                    .must(baseQueryBuilder)
                    .filter(geoBuilder);
            Query finalQuery = new NativeSearchQueryBuilder()
                    .withQuery(combined)
                    .withMaxResults(20)
                    .build();
            var hits = esOps.search(finalQuery, Map.class);
            return hits.getSearchHits().stream()
                    .map(SearchHit::getContent)
                    .collect(java.util.stream.Collectors.<Map<String, Object>>toList());
        } else {
            // No geo – simple query with limit 20.
            Query finalQuery = new NativeSearchQueryBuilder()
                    .withQuery(baseQueryBuilder)
                    .withMaxResults(20)
                    .build();
            var hits = esOps.search(finalQuery, Map.class);
            return hits.getSearchHits().stream()
                    .map(SearchHit::getContent)
                    .collect(java.util.stream.Collectors.<Map<String, Object>>toList());
        }
    }
}
