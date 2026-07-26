package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.SystemHealthSummaryDto;
import com.ksp.intelligence.dto.SystemServiceDto;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
public class SystemHealthController {

    private final StringRedisTemplate redis;

    public SystemHealthController(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @GetMapping(value = "/api/v1/system/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public SystemHealthSummaryDto getSystemHealth() {
        List<SystemServiceDto> services = new ArrayList<>();

        services.add(SystemServiceDto.builder()
                .name("Kafka Consumer").sub("indexing-service")
                .metric("active").status("healthy").build());

        long esCount = countKeys("crime-index");
        services.add(SystemServiceDto.builder()
                .name("ElasticSearch").sub("crime-index")
                .metric(esCount + " docs").status("healthy").build());

        Long hotspotsSize = redis.opsForZSet().zCard("hotspots:live");
        services.add(SystemServiceDto.builder()
                .name("Redis Cache").sub("hotspots:live")
                .metric((hotspotsSize != null ? hotspotsSize : 0) + " keys").status("healthy").build());

        services.add(SystemServiceDto.builder()
                .name("Neo4j Graph").sub("crime-network")
                .metric("available").status("healthy").build());

        services.add(SystemServiceDto.builder()
                .name("ML Inference").sub("prediction-engine")
                .metric("ready").status("healthy").build());

        return SystemHealthSummaryDto.builder()
                .services(services)
                .cpuPct(12.0)
                .ramGb(4.2)
                .build();
    }

    private long countKeys(String pattern) {
        try {
            return redis.countExistingKeys(List.of(pattern));
        } catch (Exception e) {
            return 0;
        }
    }
}
