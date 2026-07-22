package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.AuditLog;
import com.ksp.intelligence.repository.AuditLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
    public UUID createAudit(@RequestBody Map<String, Object> body) {
        AuditLog log = new AuditLog(
                (String) body.getOrDefault("officerId", "anonymous"),
                (String) body.getOrDefault("actionType", "UNKNOWN"),
                (String) body.getOrDefault("queryText", ""),
                (String) body.getOrDefault("endpointCalled", ""),
                body.containsKey("resultCount") ? ((Number) body.get("resultCount")).intValue() : null,
                (String) body.getOrDefault("ipAddress", "")
        );
        auditRepo.save(log);
        return log.getAuditId();
    }

    @GetMapping(value = "/api/v1/audit/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public AuditLog getAudit(@PathVariable UUID id) {
        return auditRepo.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Audit not found"));
    }
}
