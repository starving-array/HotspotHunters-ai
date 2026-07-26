package com.ksp.intelligence.service;

import com.ksp.intelligence.config.RedisKeysProperties;
import com.ksp.intelligence.model.AlertEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Publishes an {@link AlertEvent} to the Redis Stream (replaces Kafka).
 * The SSE endpoint reads from this stream.
 */
@Service
public class AlertPublisher {

    private static final Logger log = LoggerFactory.getLogger(AlertPublisher.class);

    private final StringRedisTemplate redis;
    private final RedisKeysProperties keys;

    public AlertPublisher(StringRedisTemplate redis, RedisKeysProperties keys) {
        this.redis = redis;
        this.keys = keys;
    }

    public void publish(AlertEvent alert) {
        try {
            Map<String, String> entry = new HashMap<>();
            entry.put("alert_id", alert.getAlertId());
            entry.put("district", alert.getDistrictCode());
            entry.put("severity", alert.getSeverity().name());
            entry.put("current_count", String.valueOf(alert.getCurrentCount()));
            entry.put("expected_count", String.valueOf(alert.getExpectedCount()));
            entry.put("stddev", String.valueOf(alert.getStddev()));
            entry.put("threshold_sigma", String.valueOf(alert.getThresholdSigma()));
            entry.put("message", alert.getMessage());
            entry.put("triggered_at", alert.getTriggeredAt().toString());

            redis.opsForStream().add(keys.getStreamKey(), entry);
            // Keep stream capped
            redis.opsForStream().trim(keys.getStreamKey(), keys.getStreamMaxlen() - 1, true);

            log.debug("Published alert {} for district={} severity={}",
                    alert.getAlertId(), alert.getDistrictCode(), alert.getSeverity());
        } catch (Exception e) {
            log.error("Failed to publish alert {}: {}", alert.getAlertId(), e.getMessage(), e);
        }
    }
}