package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.AuditLog;
import com.ksp.intelligence.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditControllerGetTest {

    @Mock
    private AuditLogRepository repo;

    private AuditController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AuditController(repo);
    }

    @Test
    void getAudit_found() {
        UUID id = UUID.randomUUID();
        AuditLog log = new AuditLog("officer", "action", null, "/api", null, null);
        // set id via reflection (constructor generates one)
        when(repo.findById(id)).thenReturn(Optional.of(log));
        AuditLog result = controller.getAudit(id);
        assertNotNull(result);
        verify(repo).findById(id);
    }

    @Test
    void getAudit_notFoundThrows() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.empty());
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> controller.getAudit(id));
    }
}
