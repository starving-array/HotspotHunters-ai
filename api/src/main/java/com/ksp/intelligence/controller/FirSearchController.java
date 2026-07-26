package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.FirSearchResultDto;
import com.ksp.intelligence.service.FirSearchService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fir-search")
public class FirSearchController {

    private final FirSearchService firSearchService;

    public FirSearchController(FirSearchService firSearchService) {
        this.firSearchService = firSearchService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> search(@RequestParam(value = "q", defaultValue = "") String q) {
        List<FirSearchResultDto> results = firSearchService.search(q);
        return Map.of("results", results, "totalHits", results.size());
    }
}
