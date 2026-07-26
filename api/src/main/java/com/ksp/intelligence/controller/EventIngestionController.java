package com.ksp.intelligence.controller;

import com.ksp.intelligence.config.RedisKeysProperties;
import com.ksp.intelligence.model.FirEventDto;
import com.ksp.intelligence.model.FirRecord;
import com.ksp.intelligence.repository.FirRecordRepository;
import com.ksp.intelligence.service.AnomalyDetectionService;
import com.ksp.intelligence.service.AlertPublisher;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * HTTP endpoint replacement for Kafka consumers.
 * Receives FIR events via POST and performs the same processing:
 * 1. Indexing (PostgreSQL - search_vector auto-populated via trigger)
 * 2. Aggregation (Redis ZSET/HASH/STREAM)
 * 3. Anomaly detection (spike detection + alert publishing)
 */
@RestController
@RequestMapping("/api/internal/events")
public class EventIngestionController {

    private static final Logger log = LoggerFactory.getLogger(EventIngestionController.class);
    private static final ExecutorService IO_EXECUTOR = Executors.newCachedThreadPool();

    private final FirRecordRepository firRepo;
    private final StringRedisTemplate redis;
    private final RedisKeysProperties keys;
    private final AnomalyDetectionService anomalyService;
    private final AlertPublisher alertPublisher;

    public EventIngestionController(FirRecordRepository firRepo,
                                    StringRedisTemplate redis,
                                    RedisKeysProperties keys,
                                    AnomalyDetectionService anomalyService,
                                    AlertPublisher alertPublisher) {
        this.firRepo = firRepo;
        this.redis = redis;
        this.keys = keys;
        this.anomalyService = anomalyService;
        this.alertPublisher = alertPublisher;
    }

    /**
     * Receives a single FIR event and processes it through all three pipelines.
     * Returns 202 Accepted immediately after validation; processing happens async.
     */
    @PostMapping("/fir")
    public ResponseEntity<Void> ingestFir(@Valid @RequestBody FirEventDto dto) {
        if (dto.getFirId() == null || dto.getDistrictCode() == null) {
            return ResponseEntity.badRequest().build();
        }

        CompletableFuture.runAsync(() -> {
            String dedupKey = "processed:fir:" + dto.getFirId();
            Boolean firstSeen = redis.opsForValue().setIfAbsent(dedupKey, "1", Duration.ofHours(1));
            if (Boolean.FALSE.equals(firstSeen)) {
                log.debug("Skipping duplicate FIR {} (idempotency)", dto.getFirId());
                return;
            }

            try {
                // 1. Indexing - save to PostgreSQL (search_vector auto-updated via trigger)
                CompletableFuture.runAsync(() -> {
                    FirRecord entity = FirRecord.from(dto);
                    firRepo.save(entity);
                    log.debug("Saved FIR {} to PostgreSQL", dto.getFirId());
                }, IO_EXECUTOR).join();

                // 2. Aggregation - Redis operations
                String district = dto.getDistrictCode();
                String crimeType = dto.getCrimeType();

                // 2a. Sorted Set leaderboard
                redis.opsForZSet().incrementScore(keys.getHotspotsKey(), district, 1.0);

                // 2b. Hash per district (24h breakdown)
                String hashKey = keys.getDistrict24hPrefix() + district;
                redis.opsForHash().increment(hashKey, crimeType, 1L);
                redis.expire(hashKey, Duration.ofHours(25));

                // 2c. Stream append (capped)
                Map<String, String> streamEntry = new HashMap<>();
                streamEntry.put("fir_id", dto.getFirId());
                streamEntry.put("district", district);
                streamEntry.put("crime_type", crimeType);
                streamEntry.put("station_code", dto.getStationCode() != null ? dto.getStationCode() : "");
                streamEntry.put("incident_ts", dto.getIncidentTs() != null ? dto.getIncidentTs().toString() : "");
                streamEntry.put("severity", "LIVE");
                redis.opsForStream().add(keys.getStreamKey(), streamEntry);
                redis.opsForStream().trim(keys.getStreamKey(), keys.getStreamMaxlen() - 1, true);

                log.debug("Aggregated FIR {} (district={}, crime_type={})",
                        dto.getFirId(), district, crimeType);

                // 3. Anomaly detection
                Optional<AnomalyDetectionService.SpikeResult> spike =
                        anomalyService.observeAndDetect(district, java.time.Instant.now());

                spike.ifPresent(result -> {
                    com.ksp.intelligence.model.AlertEvent.Severity severity = result.z() >=
                            getHighSeveritySigma() ? com.ksp.intelligence.model.AlertEvent.Severity.HIGH
                            : com.ksp.intelligence.model.AlertEvent.Severity.MEDIUM;

                    String message = String.format(
                            "Spike detected: %d events vs expected %.2f ± %.2f (z=%.2f)",
                            result.currentCount(), result.mean(), result.stddev(), result.z());

                    com.ksp.intelligence.model.AlertEvent alert = com.ksp.intelligence.model.AlertEvent.builder()
                            .alertId(java.util.UUID.randomUUID().toString())
                            .districtCode(district)
                            .severity(severity)
                            .currentCount(result.currentCount())
                            .expectedCount(result.mean())
                            .stddev(result.stddev())
                            .thresholdSigma(getSpikeThresholdSigma())
                            .message(message)
                            .triggeredAt(java.time.Instant.now())
                            .build();

                    alertPublisher.publish(alert);
                    log.info("Anomaly alert published for district={} severity={} z={}",
                            district, severity, result.z());
                });

            } catch (Exception e) {
                log.error("Failed to process FIR {}: {}", dto.getFirId(), e.getMessage(), e);
            }
        }, IO_EXECUTOR);

        return ResponseEntity.accepted().build();
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        return ResponseEntity.ok(status);
    }

    // These should be injected from config, hardcoded for now to match AnomalyProperties
    private double getSpikeThresholdSigma() { return 2.0; }
    private double getHighSeveritySigma() { return 3.0; }
}