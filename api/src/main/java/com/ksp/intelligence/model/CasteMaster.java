package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

/**
 * JPA entity for the {@code CasteMaster} lookup table (Phase 3a).
 * Note: column names use snake_case per the original ER diagram.
 * Seeded via migration 007_missing_master_tables.sql.
 */
@Entity
@Table(name = "CasteMaster")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CasteMaster {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "caste_master_id")
    private Integer casteMasterId;

    @Column(name = "caste_master_name", length = 100, nullable = false)
    private String casteMasterName;
}
