package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.AuditLog;
import com.ksp.intelligence.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditControllerTest {

    @Mock
    private AuditLogRepository repo;

    private AuditController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AuditController(repo);
    }

    @Test
    void createAudit_persistsAndReturnsId() {
        Map<String, Object> body = Map.of(
            "officerId", "O123",
            "actionType", "SEARCH",
            "endpointCalled", "/api/v1/search",
            "queryText", "",
            "ipAddress", "127.0.0.1"
        );
        UUID result = controller.createAudit(body);
        assertNotNull(result);
        verify(repo).save(any(AuditLog.class));
    }
}