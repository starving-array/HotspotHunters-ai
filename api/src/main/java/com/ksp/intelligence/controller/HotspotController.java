package com.ksp.intelligence.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
public class HotspotController {

    private final StringRedisTemplate redisTemplate;

    @Value("${ksp.redis.keys.hotspots-live:hotspots:live}")
    private String hotspotsKey;

    @Value("${ksp.redis.keys.district-names:district:names}")
    private String districtNamesKey;

    public HotspotController(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Returns the top N districts from the live leaderboard sorted set.
     *
     * @param limit number of districts to return (default 10, max 100)
     * @return list of maps { "district": String, "score": Double }
     */
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

    /**
     * Returns a breakdown for a specific district – its name and current score.
     *
     * @param districtId the district identifier (Redis member value)
     * @return map { "districtId": "...", "districtName": "...", "score": ... }
     */
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
}
