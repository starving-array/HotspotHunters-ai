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
 * JPA entity for the {@code CrimeHead} lookup table (Phase 3a).
 * Top-level crime grouping: Crimes Against Body, Property, Women, Cyber Crimes, etc.
 */
@Entity
@Table(name = "CrimeHead")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CrimeHead {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CrimeHeadID")
    private Integer crimeHeadID;

    @Column(name = "CrimeGroupName", length = 200, nullable = false)
    private String crimeGroupName;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
