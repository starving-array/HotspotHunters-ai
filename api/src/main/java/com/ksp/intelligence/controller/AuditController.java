package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.AuditLog;
import com.ksp.intelligence.repository.AuditLogRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@Validated
public class AuditController {

    private final AuditLogRepository auditRepo;

    public AuditController(AuditLogRepository auditRepo) {
        this.auditRepo = auditRepo;
    }

    public static class AuditRequest {
        @NotBlank public String officerId;
        @NotBlank public String actionType;
        public String queryText;
        @NotBlank public String endpointCalled;
        public Integer resultCount;
        public String ipAddress;
    }

    @PostMapping(value = "/api/v1/audit", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public UUID createAudit(@RequestBody @Validated AuditRequest req) {
        AuditLog log = new AuditLog(
                req.officerId,
                req.actionType,
                req.queryText,
                req.endpointCalled,
                req.resultCount,
                req.ipAddress
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
