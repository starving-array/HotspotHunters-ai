package com.ksp.intelligence.controller;

// CATALYST: ElasticSearch-based search controller is disabled.
// Replaced by PgSearchController using PostgreSQL native queries.
// Uncomment for local Docker deployment with ElasticSearch.
/*
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.GeoLocation;
import co.elastic.clients.elasticsearch._types.LatLonGeoLocation;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class SearchController {

    private final ElasticsearchClient esClient;

    @Value("${ksp.elasticsearch.crime-index:crime-index}")
    private String crimeIndex;

    public SearchController(ElasticsearchClient esClient) {
        this.esClient = esClient;
    }

    @GetMapping(value = "/api/v1/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> search(@RequestParam(value = "q", required = false) String q,
                                      @RequestParam(value = "lat", required = false) Double lat,
                                      @RequestParam(value = "lon", required = false) Double lon,
                                      @RequestParam(value = "radiusKm", defaultValue = "5") Double radiusKm) throws Exception {
        if ((lat != null || lon != null) && (lat == null || lon == null)) {
            throw new IllegalArgumentException("Both lat and lon must be provided together for geo filtering.");
        }
        String queryString = (q != null && !q.isBlank()) ? q : "*:*";

        Query query;
        if (lat != null && lon != null) {
            query = Query.of(qb -> qb
                .bool(b -> b
                    .must(m -> m.queryString(qs -> qs.query(queryString)))
                    .filter(f -> f.geoDistance(gd -> gd
                        .field("location")
                        .distance(radiusKm + "km")
                        .location(GeoLocation.of(gl -> gl
                            .latlon(LatLonGeoLocation.of(ll -> ll
                                .lat(lat)
                                .lon(lon)
                            ))
                        ))
                    ))
                )
            );
        } else {
            query = Query.of(qb -> qb.queryString(qs -> qs.query(queryString)));
        }

        SearchResponse<Map> response = esClient.search(s -> s
            .index(crimeIndex)
            .query(query),
            Map.class
        );

        List<Map> hits = response.hits().hits().stream()
            .map(Hit::source)
            .toList();

        return Map.of(
            "totalHits", response.hits().total().value(),
            "hits", hits
        );
    }

    @GetMapping(value = "/api/v1/search/geo", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> searchGeo(@RequestParam Double lat,
                                         @RequestParam Double lon,
                                         @RequestParam(defaultValue = "5") Double radius) throws Exception {
        return search(null, lat, lon, radius);
    }

    @GetMapping(value = "/api/v1/search/radius", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> searchRadius(@RequestParam Double lat,
                                            @RequestParam Double lon,
                                            @RequestParam(defaultValue = "5") Double radiusKm) throws Exception {
        return search(null, lat, lon, radiusKm);
    }

    @GetMapping(value = "/api/v1/search/fulltext", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> searchFulltext(@RequestParam String q) throws Exception {
        return search(q, null, null, null);
    }
}
*/