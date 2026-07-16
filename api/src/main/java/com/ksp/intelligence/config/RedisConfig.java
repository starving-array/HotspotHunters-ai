package com.ksp.intelligence.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis template configuration — String keys + values (pearl-light, fits our keys design).
 *
 * The three Phase 2 consumers use Redis as follows:
 *   - Sorted Set `hotspots:live`                (ZINCRBY / ZREVRANGE)
 *   - Hash        `district:24h:<district_code>` (HINCRBY / HGETALL)
 *   - Stream      `alerts:stream`               (XADD MAXLEN ~ 500)
 *
 * For the JSON-heavy interactions (anomaly service stores baseline counters),
 * we serialize as String too — JSON encodings stay valid because we use plain numbers.
 */
@Configuration
public class RedisConfig {

    @Bean(name = "stringRedisTemplate")
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory cf) {
        StringRedisTemplate t = new StringRedisTemplate();
        t.setConnectionFactory(cf);
        return t;
    }

    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory cf) {
        RedisTemplate<String, String> t = new RedisTemplate<>();
        t.setConnectionFactory(cf);
        t.setKeySerializer(new StringRedisSerializer());
        t.setValueSerializer(new StringRedisSerializer());
        t.setHashKeySerializer(new StringRedisSerializer());
        t.setHashValueSerializer(new StringRedisSerializer());
        t.afterPropertiesSet();
        return t;
    }
}
