package com.ksp.intelligence.consumer;

import com.ksp.intelligence.config.AnomalyProperties;
import com.ksp.intelligence.model.AlertEvent;
import com.ksp.intelligence.model.FirEventDto;
import com.ksp.intelligence.service.AnomalyDetectionService;
import com.ksp.intelligence.service.AlertPublisher;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * Consumer Group 3 — "anomaly-service"
 *
 * For every FIR event:
 *   1. Register the event timestamp into the district's 60-min rolling Redis ZSET
 *      (`district:rollup:60:<district>` — member=ts, score=ts, atomic ZADD).
 *   2. Evict timestamps older than the rolling window.
 *   3. Update the 24h baseline bookkeeping (sum and sum-of-squares per district, hourly buckets).
 *   4. Compute current 60-min count + mean + stddev of the 24h baseline.
 *   5. If current count > mean + spikeThresholdSigma &times; sigma → publish an
 *      {@link AlertEvent} to {@code alert-events} topic with severity MEDIUM.
 *      Above {@code highSeveritySigma} → severity HIGH.
 *
 * Delegation:
 *   - The math + baseline bookkeeping lives in {@link AnomalyDetectionService}.
 *   - This listener is just the Kafka plumbing.
 */
@Component
@ConditionalOnProperty(name = "ksp.kafka.enabled", havingValue = "true")
public class AnomalyConsumer {

    private static final Logger log = LoggerFactory.getLogger(AnomalyConsumer.class);

    private final AnomalyDetectionService anomalyService;
    private final AlertPublisher alertPublisher;
    private final AnomalyProperties props;
    private final StringRedisTemplate redis;

    public AnomalyConsumer(AnomalyDetectionService anomalyService,
                            AlertPublisher alertPublisher,
                            AnomalyProperties props,
                            StringRedisTemplate redis) {
        this.anomalyService = anomalyService;
        this.alertPublisher = alertPublisher;
        this.props = props;
        this.redis = redis;
    }

    @KafkaListener(
            topics = "${ksp.kafka.fir-topic:fir-events}",
            groupId = "${ksp.kafka.consumer-groups.anomaly:anomaly-service}",
            containerFactory = "firKafkaListenerContainerFactory"
    )
    public void onFirEvent(ConsumerRecord<String, FirEventDto> record, Acknowledgment ack) {
        FirEventDto dto = record.value();
        String dedupKey = "processed:fir:" + dto.getFirId();
        Boolean firstSeen = redis.opsForValue().setIfAbsent(dedupKey, "1", Duration.ofHours(1));
        if (Boolean.FALSE.equals(firstSeen)) {
            log.debug("Skipping already-processed FIR {} (idempotency)", dto.getFirId());
            ack.acknowledge();
            return;
        }
        try {
            // 1-4 maintained in the service
            Optional<AnomalyDetectionService.SpikeResult> spike =
                    anomalyService.observeAndDetect(dto.getDistrictCode(), java.time.Instant.now());

            // 5. publish alert if spike detected
            spike.ifPresent(result -> {
                AlertEvent.Severity severity = result.z() >= props.getHighSeveritySigma()
                        ? AlertEvent.Severity.HIGH
                        : AlertEvent.Severity.MEDIUM;

                String message = String.format(
                        "Spike detected: %d events vs expected %.2f ± %.2f (z=%.2f)",
                        result.currentCount(), result.mean(), result.stddev(), result.z());

                AlertEvent alert = AlertEvent.builder()
                        .alertId(java.util.UUID.randomUUID().toString())
                        .districtCode(dto.getDistrictCode())
                        .severity(severity)
                        .currentCount(result.currentCount())
                        .expectedCount(result.mean())
                        .stddev(result.stddev())
                        .thresholdSigma(props.getSpikeThresholdSigma())
                        .message(message)
                        .triggeredAt(java.time.Instant.now())
                        .build();

                alertPublisher.publish(alert);
                log.info("Anomaly alert published for district={} severity={} z={}",
                        dto.getDistrictCode(), severity, result.z());
            });

            ack.acknowledge();
        } catch (Exception e) {
            log.error("Anomaly consumer failed for FIR {}: {}", dto.getFirId(), e.getMessage(), e);
            throw new RuntimeException("Anomaly failure for fir_id=" + dto.getFirId(), e);
        }
    }
}
