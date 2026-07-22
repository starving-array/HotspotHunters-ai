package com.ksp.intelligence.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimitingInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate redisTemplate;
    private final MeterRegistry meterRegistry;
    private final int limitPerMinute = 100; // configurable if needed

    public RateLimitingInterceptor(StringRedisTemplate redisTemplate, MeterRegistry meterRegistry) {
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String user = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "anonymous";
        String key = "rate_limit:" + user;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count == null) {
            count = 0L;
        }
        if (count == 1) {
            // set TTL on first hit
            redisTemplate.expire(key, Duration.ofMinutes(1));
        }
        if (count > limitPerMinute) {
            response.sendError(429, "Rate limit exceeded");
            meterRegistry.counter("api_ratelimit_exceeded_total", "user", user).increment();
            return false;
        }
        return true;
    }
}
