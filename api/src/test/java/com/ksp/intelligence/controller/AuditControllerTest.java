package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.AuditLog;
import com.ksp.intelligence.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
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
        // Create request object via inner class reflection
        AuditController.AuditRequest req = new AuditController.AuditRequest();
        req.officerId = "O123";
        req.actionType = "SEARCH";
        req.endpointCalled = "/api/v1/search";
        // Stub repository save to return entity with known UUID
        UUID expected = UUID.randomUUID();
        doAnswer(invocation -> {
            AuditLog log = invocation.getArgument(0);
            // use reflection to set private field if needed - constructor sets UUID automatically
            return null;
        }).when(repo).save(any(AuditLog.class));
        UUID result = controller.createAudit(req);
        assertNotNull(result);
        // Verify save called
        verify(repo).save(any(AuditLog.class));
    }
}
