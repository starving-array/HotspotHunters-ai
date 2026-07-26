package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.GraphDataDto;
import com.ksp.intelligence.dto.LinkPredictionDto;
import com.ksp.intelligence.dto.ShapFeatureDto;
import com.ksp.intelligence.service.NetworkGraphService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
public class NetworkController {

    private final NetworkGraphService networkGraphService;
    private final StringRedisTemplate redis;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ml.service.base-url}")
    private String mlBaseUrl;

    public NetworkController(NetworkGraphService networkGraphService, StringRedisTemplate redis) {
        this.networkGraphService = networkGraphService;
        this.redis = redis;
    }

    @GetMapping(value = "/api/v1/network/graph", produces = MediaType.APPLICATION_JSON_VALUE)
    public GraphDataDto getGraph() {
        return networkGraphService.getGraph();
    }

    @GetMapping(value = "/api/v1/network/{accusedId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public GraphDataDto getAccusedNetwork(@PathVariable int accusedId) {
        return networkGraphService.getAccusedNetwork(accusedId);
    }

    @GetMapping(value = "/api/v1/network/{id}/shap", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<ShapFeatureDto> getShapFeatures(@PathVariable String id) {
        return networkGraphService.getShapFeatures(id);
    }

    @SuppressWarnings("unchecked")
    @GetMapping(value = "/api/v1/network/fir-similar/{firId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getFirSimilarity(
            @PathVariable String firId,
            @RequestParam(defaultValue = "10") int topK) {
        String url = mlBaseUrl + "/similarity/" + firId + "?top_k=" + topK;
        Map<String, Object> response = restTemplate.getForObject(url, Map.class);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/api/v1/network/link-prediction/{accusedId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<LinkPredictionDto>> getLinkPrediction(
            @PathVariable String accusedId,
            @RequestParam(defaultValue = "10") int topK) {
        String key = "link_prediction:" + accusedId;
        Set<String> predicted = redis.opsForZSet().reverseRangeByScore(key, 0, Double.MAX_VALUE, 0, topK);
        if (predicted == null || predicted.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        List<LinkPredictionDto> result = new ArrayList<>();
        int rank = 1;
        for (String pred : predicted) {
            Double score = redis.opsForZSet().score(key, pred);
            result.add(LinkPredictionDto.builder()
                    .accusedId(accusedId)
                    .predictedAccusedId(pred)
                    .score(score != null ? score : 0.0)
                    .build());
        }
        return ResponseEntity.ok(result);
    }
}
