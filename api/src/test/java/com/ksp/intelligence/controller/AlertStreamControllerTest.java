package com.ksp.intelligence.controller;

import com.ksp.intelligence.config.RedisKeysProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.Range;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AlertStreamControllerTest {

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private RedisKeysProperties keys;

    @Mock
    private StreamOperations<String, String, String> streamOps;

    private AlertStreamController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(redis.opsForStream()).thenReturn(streamOps);
        when(keys.getStreamKey()).thenReturn("alerts:stream");
        controller = new AlertStreamController(redis, keys);
    }

    @Test
    void streamAlerts_returnsEmitterAndSendsHistoricalBatch() throws Exception {
        // Prepare a fake historical entry
        MapRecord<String, String, String> record = MapRecord.create("alerts:stream", "1-0", Map.of(
                "fir_id", "FIR123",
                "district", "D01",
                "crime_type", "theft"
        ));
        when(streamOps.range(eq("alerts:stream"), any(Range.class)))
                .thenReturn(List.of(record));
        // Mock read to return null (no live data) so background thread exits quickly
        when(streamOps.read(any(), any()))
                .thenReturn(null);

        SseEmitter emitter = controller.streamAlerts();
        assertNotNull(emitter);
        // Verify historical range query was performed
        verify(streamOps).range(eq("alerts:stream"), any(Range.class));
    }
}
