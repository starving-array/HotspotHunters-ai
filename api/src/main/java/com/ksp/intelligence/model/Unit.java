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
import jakarta.persistence.OneToOne;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

/**
 * JPA entity for the {@code Unit} table (Phase 3b restructure).
 * FKs to District, UnitType (unit hierarchy), State, and self-ref ParentUnit.
 */
@Entity
@Table(name = "Unit")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Unit {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "UnitID")
    private Integer unitID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DistrictID", nullable = false)
    private District district;

    @Column(name = "StationCode", length = 20, nullable = false, unique = true)
    private String stationCode;

    @Column(name = "StationName", length = 200)
    private String stationName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "TypeID")
    private UnitType unitType;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ParentUnit")
    private Unit parentUnit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "StateID")
    private State state;

    @Column(name = "NationalityID")
    @Builder.Default
    private Integer nationalityID = 1;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
