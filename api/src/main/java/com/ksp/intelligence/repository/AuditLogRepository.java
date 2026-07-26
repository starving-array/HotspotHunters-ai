package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for storing audit log entries. */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, java.util.UUID> {
    Page<AuditLog> findAllByOrderByLoggedAtDesc(Pageable pageable);
    Page<AuditLog> findByActionTypeOrderByLoggedAtDesc(String actionType, Pageable pageable);
    Page<AuditLog> findByOfficerIdOrderByLoggedAtDesc(String officerId, Pageable pageable);
}
