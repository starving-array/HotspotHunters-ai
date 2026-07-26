package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.HotspotDetailDto;
import com.ksp.intelligence.service.HotspotService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class HotspotController {

    private final StringRedisTemplate redisTemplate;
    private final HotspotService hotspotService;

    @Value("${ksp.redis.keys.hotspots-live:hotspots:live}")
    private String hotspotsKey;

    @Value("${ksp.redis.keys.district-names:district:names}")
    private String districtNamesKey;

    public HotspotController(StringRedisTemplate redisTemplate, HotspotService hotspotService) {
        this.redisTemplate = redisTemplate;
        this.hotspotService = hotspotService;
    }

    @GetMapping(value = "/api/v1/hotspots/live", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<Map<String, Object>> getHotspots(@RequestParam(value = "limit", defaultValue = "10") int limit) {
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;
        ZSetOperations<String, String> zset = redisTemplate.opsForZSet();
        var range = zset.reverseRangeWithScores(hotspotsKey, 0, limit - 1);
        List<Map<String, Object>> result = new ArrayList<>();
        if (range != null) {
            range.forEach(item -> result.add(Map.of(
                    "district", item.getValue(),
                    "score", item.getScore()
            )));
        }
        return result;
    }

    @GetMapping(value = "/api/v1/hotspots/breakdown/{districtId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getHotspotBreakdown(@PathVariable String districtId) {
        Double score = redisTemplate.opsForZSet().score(hotspotsKey, districtId);
        String name = (String) redisTemplate.opsForHash().get(districtNamesKey, districtId);
        return Map.of(
                "districtId", districtId,
                "districtName", name != null ? name : "",
                "score", score != null ? score : 0.0
        );
    }

    @GetMapping(value = "/api/v1/hotspots/detail", produces = MediaType.APPLICATION_JSON_VALUE)
    public HotspotDetailDto getHotspotDetail(@RequestParam("district") String districtCode) {
        return hotspotService.getDistrictDetail(districtCode);
    }

    @GetMapping(value = "/api/v1/hotspots/trends", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Double> getHotspotTrends(@RequestParam("districts") String districts) {
        List<String> codes = Arrays.stream(districts.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        return hotspotService.getHotspotTrends(codes);
    }
}
