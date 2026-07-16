package com.ksp.intelligence.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.Objects;

/**
 * Anomaly alert payload — published to {@code alert-events} Kafka topic by the
 * {@code AnomalyConsumer} whenever a district's 60-minute crime rate exceeds
 * mean + 2σ of its 24-hour baseline.
 *
 * JSON shape consumed by Spring Boot SSE controller (Phase 3):
 * <pre>
 * {
 *   "alert_id":      "ALT-a8f3...",
 *   "district_code": "BLR_URB",
 *   "severity":      "HIGH",            // HIGH or MEDIUM
 *   "current_count": 12,                // count in last 60 minutes
 *   "expected_count": 4.2,               // mean of 24h baseline
 *   "stddev":         1.7,
 *   "threshold_sigma": 2.0,
 *   "message":        "Spike detected: 12 events vs expected 4.2 ± 1.7 (z=4.59)",
 *   "triggered_at":   "2026-07-16T09:18:00Z"
 * }
 * </pre>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(of = {"alertId", "districtCode", "severity", "currentCount"})
public class AlertEvent {

    private String alertId;
    private String districtCode;
    private Severity severity;
    private long currentCount;
    private double expectedCount;
    private double stddev;
    private double thresholdSigma;
    private String message;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
    @Builder.Default
    private Instant triggeredAt = Instant.now();

    public enum Severity {
        MEDIUM, HIGH
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AlertEvent that = (AlertEvent) o;
        return Objects.equals(alertId, that.alertId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(alertId);
    }
}
