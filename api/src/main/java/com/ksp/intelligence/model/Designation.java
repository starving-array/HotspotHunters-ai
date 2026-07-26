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
 * JPA entity for the {@code Designation} lookup table (Phase 3a).
 * SortOrder: 1 = Investigating Officer, 5 = Superintendent.
 */
@Entity
@Table(name = "Designation")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Designation {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DesignationID")
    private Integer designationID;

    @Column(name = "DesignationName", length = 100, nullable = false)
    private String designationName;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "SortOrder")
    @Builder.Default
    private Integer sortOrder = 0;
}
