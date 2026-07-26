package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.AnomalyEventDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
public class AnomalyController {

    private final StringRedisTemplate redis;

    @Value("${ksp.redis.keys.stream-key:alerts:stream}")
    private String streamKey;

    public AnomalyController(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @GetMapping(value = "/api/v1/anomalies", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<AnomalyEventDto> getAnomalies(@RequestParam(value = "limit", defaultValue = "50") int limit) {
        if (limit < 1) limit = 1;
        if (limit > 200) limit = 200;

        List<AnomalyEventDto> anomalies = new ArrayList<>();

        var records = redis.opsForStream().read(
                org.springframework.data.redis.connection.stream.StreamOffset.create(
                    streamKey, org.springframework.data.redis.connection.stream.ReadOffset.from("0"))
        );

        if (records != null) {
            int id = 1;
            for (var record : records) {
                if (anomalies.size() >= limit) break;
                Map<Object, Object> value = record.getValue();
                if (value != null && "HIGH".equals(value.get("severity"))) {
                    anomalies.add(AnomalyEventDto.builder()
                            .id(id++)
                            .district((String) value.getOrDefault("district", ""))
                            .zScore(parseDouble(value.get("zScore")))
                            .expected(parseDouble(value.get("expected")))
                            .actual(parseDouble(value.get("actual")))
                            .crimeType((String) value.getOrDefault("crimeType", ""))
                            .timestamp(java.time.Instant.ofEpochMilli(record.getId().getTimestamp()).toString())
                            .build());
                }
            }
        }

        return anomalies;
    }

    private double parseDouble(Object o) {
        if (o == null) return 0.0;
        try { return Double.parseDouble(o.toString()); } catch (Exception e) { return 0.0; }
    }
}
