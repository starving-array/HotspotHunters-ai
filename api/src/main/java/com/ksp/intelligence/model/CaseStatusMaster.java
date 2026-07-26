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
 * JPA entity for the {@code CaseStatusMaster} lookup table (Phase 3a).
 * CaseStatusName: Under Investigation, Charge Sheeted, Closed, Transferred, Pending Court.
 */
@Entity
@Table(name = "CaseStatusMaster")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CaseStatusMaster {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CaseStatusID")
    private Integer caseStatusID;

    @Column(name = "CaseStatusName", length = 100, nullable = false, unique = true)
    private String caseStatusName;
}
