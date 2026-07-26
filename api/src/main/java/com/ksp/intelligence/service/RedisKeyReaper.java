package com.ksp.intelligence.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class RedisKeyReaper {

    private static final Logger log = LoggerFactory.getLogger(RedisKeyReaper.class);

    private static final Duration OSINT_CACHE_TTL = Duration.ofDays(7);
    private static final Duration LINK_PREDICTION_TTL = Duration.ofDays(1);

    private final StringRedisTemplate redis;

    public RedisKeyReaper(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Scheduled(fixedRate = 6, timeUnit = TimeUnit.HOURS)
    public void reapOsintCache() {
        long count = 0;
        for (String key : scan("osint:cache:*")) {
            Long ttl = redis.getExpire(key);
            if (ttl == null || ttl < 0) {
                redis.expire(key, OSINT_CACHE_TTL);
                count++;
            }
        }
        if (count > 0) log.info("Applied TTL to {} osint:cache:* keys", count);
    }

    @Scheduled(fixedRate = 1, timeUnit = TimeUnit.HOURS)
    public void reapLinkPredictions() {
        long count = 0;
        for (String key : scan("link_prediction:*")) {
            Long ttl = redis.getExpire(key);
            if (ttl == null || ttl < 0) {
                redis.expire(key, LINK_PREDICTION_TTL);
                count++;
            }
        }
        if (count > 0) log.info("Applied TTL to {} link_prediction:* keys", count);
    }

    private List<String> scan(String pattern) {
        List<String> keys = new ArrayList<>();
        try (Cursor<byte[]> cursor = redis.getConnectionFactory().getConnection()
                .scan(ScanOptions.scanOptions().match(pattern).count(100).build())) {
            while (cursor.hasNext()) {
                keys.add(new String(cursor.next(), StandardCharsets.UTF_8));
            }
        } catch (Exception e) {
            log.warn("Redis scan failed for pattern {}: {}", pattern, e.getMessage());
        }
        return keys;
    }
}
