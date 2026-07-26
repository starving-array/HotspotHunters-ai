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
 * JPA entity for the {@code District} table (Phase 3b restructure).
 * FK to State; DistrictCode is the official Karnataka code (e.g. "2920" for Bangalore Urban).
 */
@Entity
@Table(name = "District")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class District {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DistrictID")
    private Integer districtID;

    @Column(name = "DistrictCode", length = 20, nullable = false, unique = true)
    private String districtCode;

    @Column(name = "DistrictName", length = 100, nullable = false)
    private String districtName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "StateID")
    private State state;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
