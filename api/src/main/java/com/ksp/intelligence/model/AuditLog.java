package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * JPA entity for {@code audit_log} — append-only.
 *
 * The PostgreSQL init.sql REVOKE's UPDATE and DELETE on this table from the
 * application user, so an audit entry can be appended but never tampered with.
 * JPA still models @Id on audit_id but no setters are exposed for modification.
 */
@Entity
@Table(name = "audit_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @Column(name = "audit_id", columnDefinition = "uuid")
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID auditId;

    @Column(name = "officer_id", length = 20, nullable = false)
    private String officerId;

    @Column(name = "action_type", length = 50, nullable = false)
    private String actionType;

    @Column(name = "query_text", columnDefinition = "text")
    private String queryText;

    @Column(name = "endpoint_called", length = 200)
    private String endpointCalled;

    @Column(name = "result_count")
    private Integer resultCount;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "logged_at")
    @Temporal(TemporalType.TIMESTAMP)
    @Builder.Default
    private Instant loggedAt = Instant.now();

    /**
     * Application-facing constructor — autogenerates the immutable audit_id.
     * Use the all-args constructor (via Lombok) only when rehydrating from the DB.
     */
    public AuditLog(String officerId, String actionType, String queryText,
                     String endpointCalled, Integer resultCount, String ipAddress) {
        this.auditId = UUID.randomUUID();
        this.officerId = officerId;
        this.actionType = actionType;
        this.queryText = queryText;
        this.endpointCalled = endpointCalled;
        this.resultCount = resultCount;
        this.ipAddress = ipAddress;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AuditLog auditLog = (AuditLog) o;
        return Objects.equals(auditId, auditLog.auditId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(auditId);
    }
}
