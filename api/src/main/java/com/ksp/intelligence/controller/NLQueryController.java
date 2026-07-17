package com.ksp.intelligence.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

/**
 * Proxy endpoint for natural‑language query translation.
 * It forwards the request to the configured ML FastAPI service and returns the structured response.
 */
@RestController
@RequestMapping("/api/v1/nl")
public class NLQueryController {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ml.service.base-url:http://localhost:8001}")
    private String mlBaseUrl;

    @PostMapping(value = "/query", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Object> translate(@RequestBody Object body) {
        // Forward body directly to ml-service /nl/translate
        String url = mlBaseUrl + "/nl/translate";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Object> request = new HttpEntity<>(body, headers);
        return restTemplate.exchange(url, HttpMethod.POST, request, Object.class);
    }
}
