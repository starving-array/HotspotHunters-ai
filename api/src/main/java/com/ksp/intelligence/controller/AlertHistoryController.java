package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.AlertDto;
import com.ksp.intelligence.dto.PageResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
public class AlertHistoryController {

    private final StringRedisTemplate redis;

    @Value("${ksp.redis.keys.stream-key:alerts:stream}")
    private String streamKey;

    public AlertHistoryController(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @GetMapping(value = "/api/v1/alerts", produces = MediaType.APPLICATION_JSON_VALUE)
    public PageResponse<AlertDto> getAlerts(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "crimeType", required = false) String crimeType) {

        if (page < 0) page = 0;
        if (size < 1) size = 10;
        if (size > 100) size = 100;

        var records = redis.opsForStream().read(
                StreamOffset.create(streamKey, ReadOffset.from("0"))
        );

        List<AlertDto> all = new ArrayList<>();
        if (records != null) {
            for (var record : records) {
                Map<Object, Object> value = record.getValue();
                if (value != null) {
                    String type = (String) value.getOrDefault("crimeType",
                            value.getOrDefault("crime_type", ""));
                    if (crimeType != null && !crimeType.isEmpty() && !crimeType.equals(type)) {
                        continue;
                    }
                    all.add(AlertDto.builder()
                            .id(String.valueOf(value.getOrDefault("fir_id", record.getId().getValue())))
                            .caseMasterId(parseInt(value.get("caseMasterId")))
                            .crimeNo(String.valueOf(value.getOrDefault("fir_id", "")))
                            .crimeType(type)
                            .district((String) value.getOrDefault("district", ""))
                            .latitude(parseDouble(value.get("latitude")))
                            .longitude(parseDouble(value.get("longitude")))
                            .severity((String) value.getOrDefault("severity", "low"))
                            .timestamp((String) value.getOrDefault("incident_ts",
                                    value.getOrDefault("timestamp", 
                                        java.time.Instant.ofEpochMilli(record.getId().getTimestamp()).toString())))
                            .zScore(parseDoubleObject(value.get("zScore")))
                            .expected(parseDoubleObject(value.get("expected")))
                            .actual(parseDoubleObject(value.get("actual")))
                            .build());
                }
            }
        }

        long total = all.size();
        int from = page * size;
        int to = Math.min(from + size, all.size());
        List<AlertDto> data = from < all.size() ? all.subList(from, to) : List.of();

        return PageResponse.<AlertDto>builder()
                .data(data)
                .page(page)
                .size(size)
                .total(total)
                .build();
    }

    private int parseInt(Object o) {
        if (o == null) return 0;
        try { return Integer.parseInt(o.toString()); } catch (Exception e) { return 0; }
    }

    private double parseDouble(Object o) {
        if (o == null) return 0.0;
        try { return Double.parseDouble(o.toString()); } catch (Exception e) { return 0.0; }
    }

    private Double parseDoubleObject(Object o) {
        if (o == null) return null;
        try { return Double.parseDouble(o.toString()); } catch (Exception e) { return null; }
    }
}
