package com.ksp.intelligence.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.Range;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.connection.stream.ReadOffset;
import java.time.Duration;
import java.util.List;
import com.ksp.intelligence.config.RedisKeysProperties;

@RestController
public class AlertStreamController implements org.springframework.beans.factory.DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(AlertStreamController.class);

    private final StringRedisTemplate redis;
    private final RedisKeysProperties keys;
    private Thread streamThread;

    @Autowired
    public AlertStreamController(StringRedisTemplate redis, RedisKeysProperties keys) {
        this.redis = redis;
        this.keys = keys;
    }

    @GetMapping(value = "/api/v1/alerts/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAlerts() {
        // Stream alerts from Redis as Server‑Sent Events.
        // 1️⃣ Send existing entries (historical batch).
        // 2️⃣ Continue reading new entries in a background thread and push them as they arrive.
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        try {
            // Historical batch – read all current entries (up to the configured max length).
            List<MapRecord<String, String, String>> entries = redis
                    .opsForStream()
                    .range(keys.getStreamKey(), Range.unbounded());
            for (MapRecord<String, String, String> entry : entries) {
                emitter.send(entry.getValue(), MediaType.APPLICATION_JSON);
            }
        } catch (Exception e) {
            log.error("Error sending historical alerts: {}", e.getMessage(), e);
            emitter.completeWithError(e);
            return emitter;
        }

        // Background task – block‑read new entries and push them.
        streamThread = new Thread(() -> {
            String lastId = "0-0"; // start after the historical batch (Redis will return the next ID).
            while (!emitter.isClosed()) {
                try {
                    // Block for up to 30 seconds for new data.
                    var options = StreamReadOptions.empty()
                            .count(10)
                            .block(Duration.ofSeconds(30));
                    var offset = StreamOffset.create(keys.getStreamKey(), ReadOffset.from(lastId));
                    var records = redis.opsForStream().read(options, offset);
                    if (records != null) {
                        for (var rec : records) {
                            emitter.send(rec.getValue(), MediaType.APPLICATION_JSON);
                            lastId = rec.getId().getValue();
                        }
                    }

                } catch (Exception ex) {
                    // If the client has gone away the emitter will throw an IOException – exit cleanly.
                    if (ex instanceof java.io.IOException) {
                        break;
                    }
                    log.error("Error streaming live alerts: {}", ex.getMessage(), ex);
                    emitter.completeWithError(ex);
                    break;
                }
            }
        }).start();

        return emitter;
    }

    @Override
    public void destroy() {
        if (streamThread != null && streamThread.isAlive()) {
            streamThread.interrupt();
        }
    }
}
