package com.ksp.intelligence.consumer;

import com.ksp.intelligence.config.AnomalyProperties;
import com.ksp.intelligence.model.AlertEvent;
import com.ksp.intelligence.model.FirEventDto;
import com.ksp.intelligence.service.AlertPublisher;
import com.ksp.intelligence.service.AnomalyDetectionService;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.kafka.support.Acknowledgment;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AnomalyConsumer} — Group 3 spike detection.
 *
 * Verifies:
 *   - When anomaly service detects a spike (z>=2): AlertEvent with MEDIUM/HIGH severity
 *     is published via AlertPublisher, ack is called
 *   - When no spike (Optional empty): no alert published, ack is called
 *   - Severity HIGH when z >= 3, MEDIUM when 2 <= z < 3
 */
@ExtendWith(MockitoExtension.class)
class AnomalyConsumerTest {

    @Mock private AnomalyDetectionService anomalyService;
    @Mock private AlertPublisher alertPublisher;
    @Mock private Acknowledgment ack;
    @Mock private StringRedisTemplate redis;
    @Mock private ValueOperations<String, String> valueOps;

    private AnomalyProperties props;
    private AnomalyConsumer consumer;

    private FirEventDto sampleDto;

    @BeforeEach
    void setUp() {
        lenient().when(redis.opsForValue()).thenReturn(valueOps);
        lenient().when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        props = new AnomalyProperties();
        props.setSpikeThresholdSigma(2.0);
        props.setHighSeveritySigma(3.0);
        consumer = new AnomalyConsumer(anomalyService, alertPublisher, props, redis);

        sampleDto = FirEventDto.builder()
                .firId("FIR_001")
                .districtCode("BLR_URB")
                .crimeType("robbery")
                .incidentTs(Instant.parse("2026-07-16T10:00:00Z"))
                .build();
    }

    @Test
    @DisplayName("no spike: no alert published, ack called")
    void onFirEvent_noSpike_noAlert() {
        when(anomalyService.observeAndDetect(eq("BLR_URB"), any(Instant.class)))
                .thenReturn(Optional.empty());

        consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                sampleDto.getDistrictCode(), sampleDto), ack);

        verify(alertPublisher, never()).publish(any(AlertEvent.class));
        verify(ack).acknowledge();
    }

    @Test
    @DisplayName("z>=2 → MEDIUM severity alert published")
    void onFirEvent_mediumSpike_publishesMediumAlert() {
        AnomalyDetectionService.SpikeResult result =
                new AnomalyDetectionService.SpikeResult(
                        12L, 4.0, 2.0, 2.5, Instant.now());

        when(anomalyService.observeAndDetect(eq("BLR_URB"), any(Instant.class)))
                .thenReturn(Optional.of(result));

        consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                sampleDto.getDistrictCode(), sampleDto), ack);

        ArgumentCaptor<AlertEvent> alertCaptor = ArgumentCaptor.forClass(AlertEvent.class);
        verify(alertPublisher).publish(alertCaptor.capture());
        AlertEvent alert = alertCaptor.getValue();
        assertThat(alert.getDistrictCode()).isEqualTo("BLR_URB");
        assertThat(alert.getSeverity()).isEqualTo(AlertEvent.Severity.MEDIUM);
        assertThat(alert.getCurrentCount()).isEqualTo(12L);
        assertThat(alert.getExpectedCount()).isEqualTo(4.0);
        assertThat(alert.getStddev()).isEqualTo(2.0);
        assertThat(alert.getThresholdSigma()).isEqualTo(2.0);
        assertThat(alert.getMessage()).contains("z=2.5");

        verify(ack).acknowledge();
    }

    @Test
    @DisplayName("z>=3 → HIGH severity alert published")
    void onFirEvent_highSpike_publishesHighAlert() {
        AnomalyDetectionService.SpikeResult result =
                new AnomalyDetectionService.SpikeResult(
                        20L, 5.0, 2.0, 3.5, Instant.now());

        when(anomalyService.observeAndDetect(eq("BLR_URB"), any(Instant.class)))
                .thenReturn(Optional.of(result));

        consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                sampleDto.getDistrictCode(), sampleDto), ack);

        ArgumentCaptor<AlertEvent> alertCaptor = ArgumentCaptor.forClass(AlertEvent.class);
        verify(alertPublisher).publish(alertCaptor.capture());
        assertThat(alertCaptor.getValue().getSeverity()).isEqualTo(AlertEvent.Severity.HIGH);
        verify(ack).acknowledge();
    }

    @Test
    @DisplayName("z=2 exactly (boundary) → MEDIUM")
    void onFirEvent_boundaryZ2_publishesMedium() {
        AnomalyDetectionService.SpikeResult result =
                new AnomalyDetectionService.SpikeResult(
                        8L, 4.0, 2.0, 2.0, Instant.now());

        when(anomalyService.observeAndDetect(eq("BLR_URB"), any(Instant.class)))
                .thenReturn(Optional.of(result));

        consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                sampleDto.getDistrictCode(), sampleDto), ack);

        verify(alertPublisher).publish(argThat(a -> a.getSeverity() == AlertEvent.Severity.MEDIUM));
        verify(ack).acknowledge();
    }
}
