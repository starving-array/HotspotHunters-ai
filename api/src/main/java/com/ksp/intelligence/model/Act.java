package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

/**
 * JPA entity for the {@code Act} lookup table (Phase 0 seed).
 * ActCode is a VARCHAR PK (e.g. "IPC", "IT_ACT", "SCST", "ARMS") — manually
 * assigned by the schema seed, NOT auto-generated.
 */
@Entity
@Table(name = "Act")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Act {

    @Id
    @EqualsAndHashCode.Include
    @Column(name = "ActCode", length = 20, nullable = false)
    private String actCode;

    @Column(name = "ActDescription", length = 500)
    private String actDescription;

    @Column(name = "ShortName", length = 50)
    private String shortName;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
