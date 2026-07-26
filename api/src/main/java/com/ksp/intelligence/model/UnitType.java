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
 * JPA entity for the {@code UnitType} lookup table (Phase 3a).
 * Hierarchy ranks force: 1 = State HQ, 5 = Police Station.
 */
@Entity
@Table(name = "UnitType")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class UnitType {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "UnitTypeID")
    private Integer unitTypeID;

    @Column(name = "UnitTypeName", length = 100, nullable = false)
    private String unitTypeName;

    @Column(name = "CityDistState", length = 50)
    private String cityDistState;

    @Column(name = "Hierarchy")
    private Integer hierarchy;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
