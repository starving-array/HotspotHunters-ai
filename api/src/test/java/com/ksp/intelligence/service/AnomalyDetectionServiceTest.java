package com.ksp.intelligence.service;

import com.ksp.intelligence.config.AnomalyProperties;
import com.ksp.intelligence.config.RedisKeysProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AnomalyDetectionService} — the math behind spike detection.
 *
 * The service uses Redis as its state store. We mock Redis to return:
 *   - zCard() = number of events in the 60-min rolling window (the "current count")
 *   - opsForValue().increment(baseline_key) = number of events observed in baseline (24h)
 *
 * Poisson approximation: stddev = sqrt(mean), where mean is the expected count
 * in the rolling window based on the 24h baseline rate.
 *
 * Visited cases:
 *   - baseline < 30 → no spike (cold-start protection)
 *   - low z (current vs expected not anomaly) → no spike
 *   - z exactly 2.0 → spike detected (boundary)
 *   - z >> 2.0 → spike detected, z value reported correctly
 *   - stddev = 0 (baseline count is exactly 0 in rolling window) → no spike (degenerate)
 *   - Redis exception → no spike returned (graceful degradation)
 */
@ExtendWith(MockitoExtension.class)
class AnomalyDetectionServiceTest {

    @Mock private StringRedisTemplate redis;
    @Mock private ZSetOperations<String, String> zset;
    @Mock private ValueOperations<String, String> valueOps;

    private AnomalyProperties props;
    private RedisKeysProperties keys;
    private AnomalyDetectionService service;

    @BeforeEach
    void setUp() {
        props = new AnomalyProperties();
        props.setRollingWindowMinutes(60);
        props.setBaselineWindowMinutes(1440);
        props.setSpikeThresholdSigma(2.0);
        props.setHighSeveritySigma(3.0);

        keys = new RedisKeysProperties();
        keys.setDistrictRollupPrefix("district:rollup:60:");
        keys.setDistrictBaselinePrefix("district:baseline:24h:");

        service = new AnomalyDetectionService(redis, props, keys);
    }

    @Test
    @DisplayName("cold start (baseline < 30): no spike returned")
    void coldStart_noDetection() {
        when(redis.opsForZSet()).thenReturn(zset);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(zset.add(anyString(), anyString(), anyDouble())).thenReturn(true);
        when(zset.removeRangeByScore(anyString(), anyDouble(), anyDouble())).thenReturn(0L);
        when(redis.expire(anyString(), any())).thenReturn(true);
        when(zset.zCard("district:rollup:60:BLR_URB")).thenReturn(5L);
        when(valueOps.increment("district:baseline:24h:BLR_URB")).thenReturn(5L);

        Optional<AnomalyDetectionService.SpikeResult> result =
                service.observeAndDetect("BLR_URB", Instant.now());

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("z above threshold: spike detected and reported correctly")
    void zAboveThreshold_returnsSpike() {
        // mean = baselineCount / baselineMinutes * rollingMinutes = 1440 / 1440 * 60 = 60.0
        // stddev = sqrt(mean) = sqrt(60) ≈ 7.746
        // For z = 4.0: currentCount = mean + z * stddev = 60 + 4 * 7.746 ≈ 91
        when(redis.opsForZSet()).thenReturn(zset);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(zset.add(anyString(), anyString(), anyDouble())).thenReturn(true);
        when(zset.removeRangeByScore(anyString(), anyDouble(), anyDouble())).thenReturn(0L);
        when(redis.expire(anyString(), any())).thenReturn(true);
        when(zset.zCard("district:rollup:60:BLR_URB")).thenReturn(91L);
        when(valueOps.increment("district:baseline:24h:BLR_URB")).thenReturn(1440L);

        Optional<AnomalyDetectionService.SpikeResult> result =
                service.observeAndDetect("BLR_URB", Instant.now());

        // verify baseline increment was called and returned 1440 >= 30
        verify(valueOps).increment("district:baseline:24h:BLR_URB");
        verify(zset).zCard("district:rollup:60:BLR_URB");

        assertThat(result).isPresent();
        var spike = result.get();
        assertThat(spike.currentCount()).isEqualTo(91L);
        assertThat(spike.mean()).isEqualTo(60.0);
        assertThat(spike.stddev()).isCloseTo(Math.sqrt(60.0), org.assertj.core.data.Offset.offset(1e-9));
        assertThat(spike.z()).isCloseTo(4.0, org.assertj.core.data.Offset.offset(1e-2));
    }

    @Test
    @DisplayName("z exactly 2 (boundary): spike detected")
    void zThresholdExact_boundarySpike() {
        // mean = 1920/1440 * 60 = 80 events per 60 min; stddev = sqrt(80) ≈ 8.94
        // current = 80 + 2*8.94 = 97.88 → z=2.0 exactly
        when(redis.opsForZSet()).thenReturn(zset);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(zset.add(anyString(), anyString(), anyDouble())).thenReturn(true);
        when(zset.removeRangeByScore(anyString(), anyDouble(), anyDouble())).thenReturn(0L);
        when(redis.expire(anyString(), any())).thenReturn(true);
        when(zset.zCard("district:rollup:60:BLR_URB")).thenReturn(98L);
        when(valueOps.increment("district:baseline:24h:BLR_URB")).thenReturn(1920L);

        Optional<AnomalyDetectionService.SpikeResult> result =
                service.observeAndDetect("BLR_URB", Instant.now());

        assertThat(result).isPresent();
        assertThat(result.get().z()).isGreaterThanOrEqualTo(2.0);
    }

    @Test
    @DisplayName("z < 2 (low z): no spike")
    void belowThreshold_noSpike() {
        // Mean ≈ 80, stddev ≈ 8.94; current=81 → z = (81-80)/8.94 ≈ 0.11 → no spike
        when(redis.opsForZSet()).thenReturn(zset);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(zset.add(anyString(), anyString(), anyDouble())).thenReturn(true);
        when(zset.removeRangeByScore(anyString(), anyDouble(), anyDouble())).thenReturn(0L);
        when(redis.expire(anyString(), any())).thenReturn(true);
        when(zset.zCard("district:rollup:60:BLR_URB")).thenReturn(81L);
        when(valueOps.increment("district:baseline:24h:BLR_URB")).thenReturn(1920L);

        Optional<AnomalyDetectionService.SpikeResult> result =
                service.observeAndDetect("BLR_URB", Instant.now());

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Redis exception → no spike returned (graceful)")
    void redisError_gracefulEmpty() {
        when(redis.opsForZSet()).thenThrow(new RuntimeException("Redis cluster down"));

        Optional<AnomalyDetectionService.SpikeResult> result =
                service.observeAndDetect("BLR_URB", Instant.now());

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("current count = 0 (rolling window empty) → mean=0 → stddev=1 → no spike")
    void emptyRollingWindow_noSpike() {
        // Baseline count = 1000; mean for 60 min = 1000/1440*60 ≈ 41.6
        // current = 0 → z = (0 - 41.6) / sqrt(41.6) ≈ -6.4 < 2 → no spike
        when(redis.opsForZSet()).thenReturn(zset);
        when(redis.opsForValue()).thenReturn(valueOps);
        when(zset.add(anyString(), anyString(), anyDouble())).thenReturn(true);
        when(zset.removeRangeByScore(anyString(), anyDouble(), anyDouble())).thenReturn(0L);
        when(redis.expire(anyString(), any())).thenReturn(true);
        when(zset.zCard("district:rollup:60:BLR_URB")).thenReturn(0L);
        when(valueOps.increment("district:baseline:24h:BLR_URB")).thenReturn(1000L);

        Optional<AnomalyDetectionService.SpikeResult> result =
                service.observeAndDetect("BLR_URB", Instant.now());

        assertThat(result).isEmpty();
    }
}
