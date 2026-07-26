package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

/**
 * JPA entity for the {@code Court} lookup table (Phase 3a).
 * FK to District and State (the court's jurisdiction).
 */
@Entity
@Table(name = "Court")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Court {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CourtID")
    private Integer courtID;

    @Column(name = "CourtName", length = 200, nullable = false)
    private String courtName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DistrictID")
    private District district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "StateID")
    private State state;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
