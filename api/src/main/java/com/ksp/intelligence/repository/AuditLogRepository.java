package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for storing audit log entries. */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, java.util.UUID> {
    // No custom methods needed for now
}
