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
 * JPA entity for the {@code Employee} table (Phase 3a).
 * Police personnel master — FKs to District, Unit, Rank, Designation.
 * KGID is the unique Karnataka Government ID.
 */
@Entity
@Table(name = "Employee")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Employee {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "EmployeeID")
    private Integer employeeID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DistrictID")
    private District district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UnitID")
    private Unit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RankID")
    private Rank rank;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DesignationID")
    private Designation designation;

    @Column(name = "KGID", length = 50, unique = true)
    private String kgid;

    @Column(name = "FirstName", length = 100, nullable = false)
    private String firstName;

    @Column(name = "GenderID")
    @Builder.Default
    private Integer genderID = 0;
}
