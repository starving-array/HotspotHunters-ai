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
import lombok.ToString;
import lombok.EqualsAndHashCode;

import java.time.Instant;


/**
 * JPA entity for the {@code offenders} table (PostgreSQL).
 *
 * Names are stored as SHA-256 hashes (64-char hex) per architecture §7.3.
 * PII minimisation: only age_group + modus_tags are kept, no plaintext names.
 */
@Entity
@Table(name = "offenders")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(of = {"offenderId"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Offender {

    @Id
    @EqualsAndHashCode.Include
    @Column(name = "offender_id", length = 20, nullable = false, updatable = false)
    private String offenderId;

    @Column(name = "name_hash", length = 64)
    private String nameHash;

    @Column(name = "age_group", length = 20)
    private String ageGroup;

    @Column(name = "prior_offenses")
    @Builder.Default
    private Integer priorOffenses = 0;

    @Column(name = "modus_tags", columnDefinition = "text[]")
    private String[] modusTags;

    @Column(name = "last_offense_ts")
    @Temporal(TemporalType.TIMESTAMP)
    private Instant lastOffenseTs;

    @Column(name = "risk_score")
    private Double riskScore;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    @Builder.Default
    private Instant createdAt = Instant.now();



}
