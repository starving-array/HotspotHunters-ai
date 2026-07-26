package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.CyberDashboardData;
import com.ksp.intelligence.dto.MapAlertDto;
import com.ksp.intelligence.dto.OsintResultDto;
import com.ksp.intelligence.dto.PatternAlertDto;
import com.ksp.intelligence.service.CybercrimeService;
import com.ksp.intelligence.service.OsintEnrichmentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
public class CybercrimeController {

    private final CybercrimeService cybercrimeService;
    private final OsintEnrichmentService osintService;

    public CybercrimeController(CybercrimeService cybercrimeService,
                                OsintEnrichmentService osintService) {
        this.cybercrimeService = cybercrimeService;
        this.osintService = osintService;
    }

    @GetMapping(value = "/api/v1/cyber/dashboard", produces = MediaType.APPLICATION_JSON_VALUE)
    public CyberDashboardData getDashboard() {
        return cybercrimeService.getDashboard();
    }

    @GetMapping(value = "/api/v1/cyber/map", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<MapAlertDto> getMapAlerts() {
        return cybercrimeService.getMapAlerts();
    }

    @GetMapping(value = "/api/v1/cyber/patterns", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<PatternAlertDto> getPatterns() {
        return cybercrimeService.getPatterns();
    }

    @GetMapping(value = "/api/v1/osint/lookup", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<OsintResultDto> lookupIndicator(
            @RequestParam("value") String value,
            @RequestParam(value = "type", defaultValue = "ip") String type) {
        OsintResultDto result = osintService.lookupIndicator(value, type);
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/api/v1/osint/enrich", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, List<OsintResultDto>>> enrichText(
            @RequestBody Map<String, String> body) {
        String text = body.getOrDefault("text", "");
        return ResponseEntity.ok(osintService.enrichBrieffacts(text));
    }
}
