package com.ksp.intelligence.service;

import com.ksp.intelligence.model.AlertEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

/**
 * Publishes an {@link AlertEvent} to the {@code alert-events} Kafka topic.
 *
 * Tradeoff note (Phase 2):
 *   We use {@code KafkaTemplate<String, AlertEvent>} with the JsonSerializer,
 *   which adds a "__TypeId__" header. The SSE controller (Phase 3) reads from
 *   Redis Stream (fed by the aggregation consumer), NOT directly from this topic,
 *   so cross-language compatibility isn't an issue here. The Spring-only header
 *   is acceptable.
 */
@Service
public class AlertPublisher {

    private static final Logger log = LoggerFactory.getLogger(AlertPublisher.class);

    private final KafkaTemplate<String, AlertEvent> kafkaTemplate;

    @Value("${ksp.kafka.alert-topic:alert-events}")
    private String alertTopic;

    public AlertPublisher(KafkaTemplate<String, AlertEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(AlertEvent alert) {
        try {
            // Key by district code so alerts from the same district stay in the
            // same partition (helps any downstream consumer that wants ordered alerts)
            kafkaTemplate.send(alertTopic, alert.getDistrictCode(), alert);
            log.debug("Publishing alert {} for district={} severity={}",
                    alert.getAlertId(), alert.getDistrictCode(), alert.getSeverity());
        } catch (Exception e) {
            // Don't throw — alert publication best-effort. The whole point of anomaly
            // detection is to *not* break the live consumer pipeline when alerting fails.
            log.error("Failed to publish alert {}: {}", alert.getAlertId(), e.getMessage(), e);
        }
    }
}
