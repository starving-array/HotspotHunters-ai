package com.ksp.intelligence.consumer;

import com.ksp.intelligence.config.RedisKeysProperties;
import com.ksp.intelligence.model.FirEventDto;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Consumer Group 2 — "aggregation-service"
 *
 * Per architecture doc §4.2 the aggregation consumer performs three Redis
 * operations on every FIR event:
 *   1. ZINCRBY hotspots:live 1 <district_code>      — live leaderboard
 *   2. HINCRBY district:24h:<district_code> <crime_type> 1  — per-district breakdown (TTL 25h)
 *   3. XADD alerts:stream MAXLEN ~ 500 * {...}      — SSE-capable live feed (capped ~500)
 *
 * All three operations are idempotent in the sense that re-running the same event
 * would just increment counters twice — but the consumer group's offset semantics
 * mean re-processing is rare. If it does occur, accept the small skew and
 * continue (counter drift is acceptable for a demo leaderboard).
 *
 * Manual ack after all three operations succeed.
 */
@Component
public class AggregationConsumer {

    private static final Logger log = LoggerFactory.getLogger(AggregationConsumer.class);

    private final StringRedisTemplate redis;
    private final RedisKeysProperties keys;

    public AggregationConsumer(StringRedisTemplate redis, RedisKeysProperties keys) {
        this.redis = redis;
        this.keys = keys;
    }

    @KafkaListener(
            topics = "${ksp.kafka.fir-topic:fir-events}",
            groupId = "${ksp.kafka.consumer-groups.aggregation:aggregation-service}",
            containerFactory = "firKafkaListenerContainerFactory"
    )
    public void onFirEvent(ConsumerRecord<String, FirEventDto> record, Acknowledgment ack) {
        FirEventDto dto = record.value();
        try {
            String district = dto.getDistrictCode();
            String crimeType = dto.getCrimeType();

            // 1. Sorted Set leaderboard — atomic ZINCRBY
            redis.opsForZSet().incrementScore(keys.getHotspotsKey(), district, 1.0);

            // 2. Hash per district (24h breakdown). Set TTL slightly above 24h so
            //    the key survives until the next day's rollup but not forever.
            String hashKey = keys.getDistrict24hPrefix() + district;
            redis.opsForHash().increment(hashKey, crimeType, 1L);
            redis.expire(hashKey, Duration.ofHours(25));

            // 3. Stream append (capped by MAXLEN ~ 500; Spring Redis doesn't expose the
            //    approximate MAXLEN directly, so we use XADD with id "*" (auto-id) and
            //    after, we cap via a manual TRIM approximate call).
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
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to aggregate FIR {}: {}", dto.getFirId(), e.getMessage(), e);
            throw new RuntimeException("Aggregation failure for fir_id=" + dto.getFirId(), e);
        }
    }
}
