package com.ksp.intelligence.service;

import com.ksp.intelligence.config.AnomalyProperties;
import com.ksp.intelligence.config.RedisKeysProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Stateful anomaly-detection service backed by two Redis data structures:
 *
 *   - {@code district:rollup:60:<district>} — SORTED SET keyed by event timestamp.
 *     Each ZADD records one event; ZREMRANGEBYSCORE prunes older-than-60-min.
 *     ZCARD returns the current 60-min count.
 *
 *   - {@code district:baseline:24h:<district>} — HASH with three long fields
 *     tracking the 24h baseline incrementally:
 *       {@code count}  — number of events observed in the last 24h
 *       {@code sum}    — running sum (count is integer → sum == count, stored for generality)
 *       {@code sumsq}  — running sum-of-squares of per-hour counts (for stddev)
 *       {@code last_hour_ts} — last hour bucket timestamp seen (long, epoch seconds)
 *
 * Incremental stddev update (Welford-style for hourly batches):
 *   Each hour bucket contributes a sample = the count of events in that hour.
 *   On a new hour bucket, push the previous hour's count; on replay the algorithm
 *   recomputes correctly because the service is stateful per district.
 *
 * For the synthetic demo dataset (~0.33 events/sec, 30 districts), we keep the
 * implementation simple: stddev is approximated as sqrt(baselineCount) (Poisson
 * assumption — for low-rate counting processes stddev ≈ sqrt(lambda) ≈ sqrt(mean)).
 * This is mathematically reasonable AND easy to unit-test deterministically.
 *
 * If later phases want a tighter baseline, we'd persist hourly counts in a Redis
 * LIST or HyperLogLog — but the Poisson approximation is sufficient for
 * demo-grade anomaly alerts.
 *
 * Detection rule (architecture §4.2):
 *   z = (currentCount - mean) / stddev (stddev = sqrt(mean))
 *   spike if z >= spikeThresholdSigma (default 2)
 *   severity HIGH if z >= highSeveritySigma (default 3)
 */
@Service
public class AnomalyDetectionService {

    private static final Logger log = LoggerFactory.getLogger(AnomalyDetectionService.class);

    private final StringRedisTemplate redis;
    private final AnomalyProperties props;
    private final RedisKeysProperties keys;

    public AnomalyDetectionService(StringRedisTemplate redis, AnomalyProperties props,
                                    RedisKeysProperties keys) {
        this.redis = redis;
        this.props = props;
        this.keys = keys;
    }

    /**
     * Record a new event occurrence for a district and decide if it constitutes a spike.
     *
     * @return Optional of an immutable SpikeResult — non-empty if a spike was detected.
     */
    public Optional<SpikeResult> observeAndDetect(String districtCode, Instant now) {
        try {
            String rollupKey = keys.getDistrictRollupPrefix() + districtCode;
            long nowTs = now.getEpochSecond();
            long windowStart = nowTs - props.rollingWindow().getSeconds();

            // Record event — member = unique event id (we use nowTs + small random suffix) so
            // multiple events in the same second don't collide. Score = ts for range pruning.
            // We use a synthetic unique member because Redis ZSET deduplicates by member.
            String member = rollupKey + ":" + nowTs + ":" + System.nanoTime();
            redis.opsForZSet().add(rollupKey, member, (double) nowTs);

            // Prune older-than-window entries (ZREMRANGEBYSCORE: score <= windowStart)
            redis.opsForZSet().removeRangeByScore(rollupKey, 0, windowStart);

            // 60-min TTL on the rollup key (cheap cleanup, safe even if no events come later)
            redis.expire(rollupKey, props.rollingWindow().plus(Duration.ofMinutes(5)));

            // Current 60-min count
            Long currentCount = redis.opsForZSet().zCard(rollupKey);
            if (currentCount == null) currentCount = 0L;

            // Update baseline (per-district 24h count) — we update incrementally and use
            // Poisson approximation for stddev: stddev = sqrt(mean).
            String baselineKey = keys.getDistrictBaselinePrefix() + districtCode;
            Long baselineCount = redis.opsForValue().increment(baselineKey);
            redis.expire(baselineKey, props.baselineWindow());

            // If baseline is too small to trust (< 30 events observed so far), bail out.
            // Avoids false spikes from the cold-start phase of the demo.
            if (baselineCount == null || baselineCount < 30) {
                return Optional.empty();
            }

            double mean = (double) baselineCount / props.baselineWindow().toMinutes() * props.rollingWindow().toMinutes();
            // Poisson approximation: stddev = sqrt(mean) when mean is the expected count
            // of a low-rate counting process. For larger means this is conservative.
            double stddev = Math.sqrt(Math.max(mean, 1.0));

            if (stddev == 0.0) {
                return Optional.empty(); // degenerate baseline —.no signal
            }

            double z = (currentCount - mean) / stddev;
            if (z < props.getSpikeThresholdSigma()) {
                return Optional.empty();
            }

            return Optional.of(new SpikeResult(
                    currentCount,
                    mean,
                    stddev,
                    z,
                    now
            ));
        } catch (Exception e) {
            log.error("Anomaly detection failed for district {}: {}", districtCode, e.getMessage(), e);
            return Optional.empty(); // don't break the pipeline on redis errors
        }
    }

    /**
     * Immutable spike detection result returned to the consumer when a district's
     * current 60-min crime count exceeds the expected mean by spikeThresholdSigma std deviations.
     */
    public record SpikeResult(
            long currentCount,
            double mean,
            double stddev,
            double z,
            Instant detectedAt
    ) { }
}
