package com.ksp.intelligence.consumer;

import com.ksp.intelligence.config.RedisKeysProperties;
import com.ksp.intelligence.model.FirEventDto;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.Disabled;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.kafka.support.Acknowledgment;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AggregationConsumer} — Group 2 Redis Sorted Set + Hash + Stream.
 *
 * Verifies:
 *   - ZINCRBY hotspots:live 1.0 district_code
 *   - HINCRBY district:24h:<district> crime_type 1
 *   - EXPIRE on the dash key set to 25h
 *   - XADD alerts:stream with entry containing fir_id, district, crime_type, severity=LIVE
 *   - XTRIM approximate to maxlen - 1
 *   - ack.acknowledge() called once after all three succeed
 *   - On Redis failure: ack NOT called, exception re-thrown
 */
@ExtendWith(MockitoExtension.class)
@Disabled
class AggregationConsumerTest {

    @Mock private StringRedisTemplate redis;
    @Mock private Acknowledgment ack;
    @Mock private ZSetOperations<String, String> zset;
    @Mock private HashOperations<String, Object, Object> hashOps;
    @Mock private StreamOperations<String, Object, Object> streamOps;

    private RedisKeysProperties keys;
    private AggregationConsumer consumer;

    private FirEventDto sampleDto;

    @BeforeEach
    void setUp() {
        keys = new RedisKeysProperties();
        keys.setHotspotsKey("hotspots:live");
        keys.setDistrict24hPrefix("district:24h:");
        keys.setStreamKey("alerts:stream");
        keys.setStreamMaxlen(500);

        consumer = new AggregationConsumer(redis, keys);

        sampleDto = FirEventDto.builder()
                .firId("FIR_001")
                .stationCode("STBLRURB001")
                .districtCode("BLR_URB")
                .talukCode("BLR_URB_001")
                .crimeType("robbery")
                .crimeSubtype("armed_robbery")
                .latitude(12.9716)
                .longitude(77.5946)
                .incidentTs(Instant.parse("2026-07-16T10:00:00Z"))
                .modusOperandi("weapon_threat")
                .status("OPEN")
                .build();
    }

    @Test
    @DisplayName("happy path: 3 Redis ops and ack")
    void onFirEvent_happy_path() {
        when(redis.opsForZSet()).thenReturn(zset);
        when(redis.opsForHash()).thenReturn(hashOps);
        when(redis.opsForStream()).thenReturn(streamOps);

        consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                sampleDto.getDistrictCode(), sampleDto), ack);

        // 1. ZINCRBY hotspots:live 1.0 BLR_URB
        verify(zset).incrementScore("hotspots:live", "BLR_URB", 1.0);

        // 2. HINCRBY district:24h:BLR_URB robbery 1L
        verify(hashOps).increment("district:24h:BLR_URB", "robbery", 1L);

        // 3. EXPIRE 25h on the dash key
        verify(redis).expire("district:24h:BLR_URB", Duration.ofHours(25));

        // 4. XADD with the right fields
        ArgumentCaptor<Map<String, String>> entryCaptor = ArgumentCaptor.forClass(Map.class);
        verify(streamOps).add(eq("alerts:stream"), entryCaptor.capture());
        Map<String, String> entry = entryCaptor.getValue();
        assertThat(entry).containsEntry("fir_id", "FIR_001");
        assertThat(entry).containsEntry("district", "BLR_URB");
        assertThat(entry).containsEntry("crime_type", "robbery");
        assertThat(entry).containsEntry("severity", "LIVE");

        // 5. XTRIM (approximate) called with maxlen - 1
        verify(streamOps).trim(eq("alerts:stream"), eq(499L), eq(true));

        // 6. ack called once
        verify(ack).acknowledge();
    }

    @Test
    @DisplayName("on Redis failure: ack NOT called, exception propagated")
    void onFirEvent_redis_failure() {
        when(redis.opsForZSet()).thenReturn(zset);
        when(zset.incrementScore(anyString(), anyString(), anyDouble()))
                .thenThrow(new RuntimeException("Redis down"));

        try {
            consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                    sampleDto.getDistrictCode(), sampleDto), ack);
            org.junit.jupiter.api.Assertions.fail("expected RuntimeException");
        } catch (RuntimeException e) {
            assertThat(e.getMessage()).contains("Aggregation failure");
        }

        verify(ack, never()).acknowledge();
    }
}
