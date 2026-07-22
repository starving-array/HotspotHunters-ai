package com.ksp.intelligence.interceptor;

import com.ksp.intelligence.model.AuditLog;
import com.ksp.intelligence.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import io.micrometer.core.instrument.MeterRegistry;

@Component
public class AuditInterceptor implements HandlerInterceptor {

    private final AuditLogRepository auditRepo;
    private final MeterRegistry meterRegistry;

    public AuditInterceptor(AuditLogRepository auditRepo, MeterRegistry meterRegistry) {
        this.auditRepo = auditRepo;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        try {
            String officerId = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "anonymous";
            String actionType = request.getMethod();
            String endpoint = request.getRequestURI();
            String query = request.getQueryString();
            String queryText = query != null ? query : "";
            Integer resultCount = null; // could be populated from response if needed
            String ip = request.getRemoteAddr();
            AuditLog log = new AuditLog(officerId, actionType, queryText, endpoint, resultCount, ip);
            auditRepo.save(log);
            meterRegistry.counter("api_audit_events_total", "officer", officerId).increment();
        } catch (Exception ignored) {
            // audit log failure must never break the request
        }
    }
}
