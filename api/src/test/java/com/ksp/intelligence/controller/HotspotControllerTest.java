package com.ksp.intelligence.controller;

import com.ksp.intelligence.service.HotspotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HotspotControllerTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private HotspotService hotspotService;

    @Mock
    private ZSetOperations<String, String> zSetOps;

    private HotspotController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(redisTemplate.opsForZSet()).thenReturn(zSetOps);
        controller = new HotspotController(redisTemplate, hotspotService);
    }

    @Test
    void getHotspots_limitsClamped() {
        when(zSetOps.reverseRangeWithScores(anyString(), anyLong(), anyLong()))
                .thenReturn(Set.of());
        var result1 = controller.getHotspots(0);
        assertNotNull(result1);
        var result2 = controller.getHotspots(200);
        assertNotNull(result2);
    }
}
