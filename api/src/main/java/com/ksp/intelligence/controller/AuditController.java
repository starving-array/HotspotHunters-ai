package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.AuditLog;
import com.ksp.intelligence.repository.AuditLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
public class AuditController {

    private final AuditLogRepository auditRepo;

    public AuditController(AuditLogRepository auditRepo) {
        this.auditRepo = auditRepo;
    }

    @PostMapping(value = "/api/v1/audit", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public UUID createAudit(@RequestBody Map<String, Object> body) {
        AuditLog log = new AuditLog(
                (String) body.getOrDefault("officerId", "anonymous"),
                (String) body.getOrDefault("actionType", "UNKNOWN"),
                (String) body.getOrDefault("queryText", ""),
                (String) body.getOrDefault("endpointCalled", ""),
                body.containsKey("resultCount") ? ((Number) body.get("resultCount")).intValue() : null,
                (String) body.getOrDefault("ipAddress", "0.0.0.0")
        );
        auditRepo.save(log);
        return log.getAuditId();
    }

    @GetMapping(value = "/api/v1/audit/history/{officerId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public org.springframework.data.domain.Page<AuditLog> getAuditByOfficer(
            @PathVariable String officerId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int page) {
        var pageable = org.springframework.data.domain.PageRequest.of(page, Math.min(limit, 200));
        return auditRepo.findByOfficerIdOrderByLoggedAtDesc(officerId, pageable);
    }

    @GetMapping(value = "/api/v1/audit/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public AuditLog getAudit(@PathVariable UUID id) {
        return auditRepo.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Audit not found"));
    }

    @GetMapping(value = "/api/v1/audit", produces = MediaType.APPLICATION_JSON_VALUE)
    public org.springframework.data.domain.Page<AuditLog> getAuditTrail(
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "limit", defaultValue = "50") int limit,
            @RequestParam(value = "page", defaultValue = "0") int page) {
        var pageable = org.springframework.data.domain.PageRequest.of(page, Math.min(limit, 200));
        if (action != null && !action.isEmpty() && !"all".equalsIgnoreCase(action)) {
            return auditRepo.findByActionTypeOrderByLoggedAtDesc(action.toUpperCase(), pageable);
        }
        return auditRepo.findAllByOrderByLoggedAtDesc(pageable);
    }
}
