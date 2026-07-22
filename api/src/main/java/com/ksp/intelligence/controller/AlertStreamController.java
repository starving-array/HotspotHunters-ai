package com.ksp.intelligence.controller;

import com.ksp.intelligence.config.RedisKeysProperties;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
public class AlertStreamController {

    private final StringRedisTemplate redis;
    private final RedisKeysProperties keys;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public AlertStreamController(StringRedisTemplate redis, RedisKeysProperties keys) {
        this.redis = redis;
        this.keys = keys;
    }

    @GetMapping(value = "/api/v1/alerts/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAlerts() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        executor.submit(() -> {
            String lastId = "0-0";
            try {
                while (true) {
                    String streamKey = keys.getStreamKey();
                    if (Boolean.TRUE.equals(redis.hasKey(streamKey))) {
                        var records = redis.opsForStream().read(
                                StreamOffset.create(streamKey, ReadOffset.from(lastId))
                        );
                        if (records != null) {
                            for (var record : records) {
                                Map<Object, Object> value = record.getValue();
                                if (value != null) {
                                    emitter.send(SseEmitter.event()
                                            .name("alert")
                                            .data(value));
                                }
                                lastId = record.getId().getValue();
                            }
                        }
                    }
                    Thread.sleep(2000);
                }
            } catch (Exception e) {
                try { emitter.completeWithError(e); } catch (Exception ignored) {}
            }
        });
        emitter.onCompletion(() -> {});
        emitter.onTimeout(emitter::complete);
        return emitter;
    }
}
