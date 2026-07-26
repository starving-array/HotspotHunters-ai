package com.ksp.intelligence.consumer;

import com.ksp.intelligence.config.RedisKeysProperties;
import com.ksp.intelligence.model.FirEventDto;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.support.Acknowledgment;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for {@link AggregationConsumer} — works against the live Redis
 * instance from docker-compose (ksp-redis) running on port 6379 of the host
 * machine.
 *
 * In CI or local mvn verify, connect to {@code host.docker.internal:6379}
 * (or {@code localhost:6379} when Maven runs natively). The test resets its
 * own Redis data upfront so your development leaderboard is not disturbed.
 *
 * Tagged {@code "integration"} and executed by maven-failsafe-plugin.
 * Surefire excludes integration-tagged tests — run via {@code mvn verify}.
 */
@Tag("integration")
class AggregationConsumerIT {

    private static StringRedisTemplate redis;
    private static LettuceConnectionFactory connectionFactory;

    @BeforeAll
    static void startRedis() {
        RedisStandaloneConfiguration cfg = new RedisStandaloneConfiguration(
                "host.docker.internal", 6379);
        connectionFactory = new LettuceConnectionFactory(cfg);
        connectionFactory.afterPropertiesSet();
        redis = new StringRedisTemplate();
        redis.setConnectionFactory(connectionFactory);
        redis.afterPropertiesSet();
    }

    @AfterAll
    static void stopRedis() {
        if (connectionFactory != null) {
            connectionFactory.destroy();
        }
    }

    @BeforeEach
    void flushTestKeys() {
        // Use a dedicated namespace so the dev leaderboard is untouched.
        Set<String> keys = redis.keys("itest:*");
        if (keys != null && !keys.isEmpty()) {
            redis.delete(keys);
        }
    }

    // ---------- helpers ----------

    private RedisKeysProperties itestKeys() {
        RedisKeysProperties keys = new RedisKeysProperties();
        keys.setHotspotsKey("itest:hotspots:live");
        keys.setDistrict24hPrefix("itest:district:24h:");
        keys.setStreamKey("itest:alerts:stream");
        keys.setStreamMaxlen(500);
        return keys;
    }

    // ---------- tests ----------

    @Test
    @DisplayName("live Redis: 100 events → hotspots ZCARD=10, districts ranked, hash + stream populated")
    void liveRedis_pipelineUpdatesAllStructures() {
        RedisKeysProperties keys = itestKeys();
        AggregationConsumer consumer = new AggregationConsumer(redis, keys);

        List<String> districts = List.of("BLR_URB", "BLR_URB", "BLR_URB",
                "MYSURU", "MYSURU", "HUBLI", "DAVANGERE", "MANGALURU",
                "BELAGAVI", "KALABURAGI");
        java.util.Map<String, Long> expectedDistrictCounts = new java.util.HashMap<>();
        java.util.Map<String, java.util.Map<String, Long>> expectedHashCounts =
                new java.util.HashMap<>();

        int totalEvents = 100;
        for (int i = 0; i < totalEvents; i++) {
            String district = districts.get(i % districts.size());
            String crimeType = (i % 2 == 0) ? "robbery" : "theft";

            FirEventDto dto = FirEventDto.builder()
                    .firId("FIR_IT_" + String.format("%03d", i))
                    .stationCode("STBLRURB001")
                    .districtCode(district)
                    .talukCode(district + "_001")
                    .crimeType(crimeType)
                    .crimeSubtype(crimeType + "_subtype")
                    .latitude(12.9716 + (i * 0.0001))
                    .longitude(77.5946 + (i * 0.0001))
                    .incidentTs(Instant.now())
                    .registeredTs(Instant.now())
                    .modusOperandi("integration_test_tag")
                    .status("OPEN")
                    .build();

            AtomicBoolean acked = new AtomicBoolean(false);
            Acknowledgment ack = () -> acked.set(true);

            consumer.onFirEvent(
                    new ConsumerRecord<>("fir-events", 0, i, dto.getDistrictCode(), dto),
                    ack);

            assertThat(acked.get())
                    .as("ack must be called for event " + dto.getFirId())
                    .isTrue();

            expectedDistrictCounts.merge(district, 1L, Long::sum);
            expectedHashCounts
                    .computeIfAbsent(district, k -> new java.util.HashMap<>())
                    .merge(crimeType, 1L, Long::sum);
        }

        // ---- Verify Sorted Set -----------------------------------------------
        Long zcard = redis.opsForZSet().zCard(keys.getHotspotsKey());
        assertThat(zcard).isEqualTo((long) expectedDistrictCounts.size());

        Set<String> membersInRedis = new HashSet<>(redis.opsForZSet()
                .reverseRangeByScore(keys.getHotspotsKey(),
                        Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY));
        assertThat(membersInRedis).isEqualTo(new HashSet<>(expectedDistrictCounts.keySet()));

        expectedDistrictCounts.forEach((district, expectedCount) -> {
            Double score = redis.opsForZSet().score(keys.getHotspotsKey(), district);
            assertThat(score)
                    .as("score for district %s should be %d", district, expectedCount)
                    .isEqualTo(expectedCount.doubleValue());
        });

        // ---- Verify Hash -----------------------------------------------------
        expectedHashCounts.forEach((district, crimeCounts) -> {
            String hashKey = keys.getDistrict24hPrefix() + district;
            java.util.Map<Object, Object> entries = redis.opsForHash().entries(hashKey);
            crimeCounts.forEach((crimeType, expectedCount) ->
                    assertThat(entries.get(crimeType))
                            .as("Hash %s field %s should equal %d", hashKey, crimeType, expectedCount)
                            .isEqualTo(String.valueOf(expectedCount)));
            assertThat(redis.getExpire(hashKey))
                    .as("Hash %s TTL should be positive", hashKey)
                    .isPositive();
        });

        // ---- Verify Stream ---------------------------------------------------
        assertThat(redis.opsForStream().size(keys.getStreamKey()))
                .as("stream length should equal total events")
                .isEqualTo((long) totalEvents);
    }

    @Test
    @DisplayName("Idempotent — re-playing the same FIR is skipped (SETNX dedup)")
    void liveRedis_replayIsIdempotent() {
        RedisKeysProperties keys = itestKeys();
        String district = "ITEST_IDEMP_" + UUID.randomUUID().toString().substring(0, 8);

        AggregationConsumer consumer = new AggregationConsumer(redis, keys);

        FirEventDto dto = FirEventDto.builder()
                .firId("FIR_IDEMP_" + UUID.randomUUID())
                .stationCode("STTEST001")
                .districtCode(district)
                .talukCode(district + "_001")
                .crimeType("arson")
                .latitude(13.0)
                .longitude(78.0)
                .incidentTs(Instant.now())
                .registeredTs(Instant.now())
                .modusOperandi("replay_test")
                .status("OPEN")
                .build();

        consumer.onFirEvent(
                new ConsumerRecord<>("fir-events", 0, 0L, dto.getDistrictCode(), dto), () -> {});
        Double score1 = redis.opsForZSet().score(keys.getHotspotsKey(), district);

        // Replay same FIR — should be idempotently skipped
        consumer.onFirEvent(
                new ConsumerRecord<>("fir-events", 0, 1L, dto.getDistrictCode(), dto), () -> {});
        Double score2 = redis.opsForZSet().score(keys.getHotspotsKey(), district);

        assertThat(score1).isNotNull();
        assertThat(score2).isNotNull();
        assertThat(score2)
                .as("replaying the same event is skipped via SETNX idempotency guard")
                .isEqualTo(score1);
    }

    @Test
    @DisplayName("TTL is re-armed on each new event (EXPIRE 25h reset per distinct FIR)")
    void liveRedis_ttlRenewed() throws InterruptedException {
        RedisKeysProperties keys = itestKeys();
        String district = "ITEST_TTL_" + UUID.randomUUID().toString().substring(0, 8);

        AggregationConsumer consumer = new AggregationConsumer(redis, keys);

        FirEventDto dto1 = FirEventDto.builder()
                .firId("FIR_TTL_1_" + UUID.randomUUID())
                .stationCode("STTEST001")
                .districtCode(district)
                .talukCode(district + "_001")
                .crimeType("burglary")
                .latitude(13.0)
                .longitude(78.0)
                .incidentTs(Instant.now())
                .registeredTs(Instant.now())
                .modusOperandi("ttl_test1")
                .status("OPEN")
                .build();

        consumer.onFirEvent(
                new ConsumerRecord<>("fir-events", 0, 0L, dto1.getDistrictCode(), dto1), () -> {});
        String hashKey = keys.getDistrict24hPrefix() + district;
        Long ttl = redis.getExpire(hashKey);
        assertThat(ttl).as("TTL should be positive after write").isPositive();

        Thread.sleep(1_500);

        // Distinct FIR ID — should NOT be deduplicated
        FirEventDto dto2 = FirEventDto.builder()
                .firId("FIR_TTL_2_" + UUID.randomUUID())
                .stationCode("STTEST002")
                .districtCode(district)
                .talukCode(district + "_001")
                .crimeType("burglary")
                .latitude(13.0)
                .longitude(78.0)
                .incidentTs(Instant.now())
                .registeredTs(Instant.now())
                .modusOperandi("ttl_test2")
                .status("OPEN")
                .build();

        consumer.onFirEvent(
                new ConsumerRecord<>("fir-events", 0, 1L, dto2.getDistrictCode(), dto2), () -> {});
        Long ttl2 = redis.getExpire(hashKey);
        assertThat(ttl2)
                .as("TTL re-armed, should be close to 25h (~90000s) not degraded by 2s wait")
                .isBetween(Duration.ofHours(24).toSeconds(), Duration.ofHours(25).toSeconds());
    }
}