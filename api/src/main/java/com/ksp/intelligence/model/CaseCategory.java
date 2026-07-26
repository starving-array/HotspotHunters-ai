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
 * JPA entity for the {@code CaseCategory} lookup table (Phase 3a).
 * LookupValue: FIR, UDR, PAR, Zero FIR.
 */
@Entity
@Table(name = "CaseCategory")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CaseCategory {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CaseCategoryID")
    private Integer caseCategoryID;

    @Column(name = "LookupValue", length = 50, nullable = false, unique = true)
    private String lookupValue;
}
