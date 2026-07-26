package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * JPA entity for the {@code Victim} table (Phase 3b — ER-compliant restructure).
 *
 * <p>This entity now maps to the {@code Victim} table (CamelCase) created in
 * {@code init.sql §15b}, NOT the older {@code victims} ML pipeline table
 * (PII-minimised age_group + gender). The restructured table is linked to
 * CaseMaster via the composite FK {@code (CaseMasterID, CrimeRegisteredDate)}.</p>
 *
 * <p><b>NOTE:</b> The legacy {@code victims} table used by the data generator
 * for ML training features is intentionally left unmapped — it does not need
 * a JPA entity for the current use-case.</p>
 */
@Entity
@Table(name = "Victim")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Victim {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "VictimMasterID")
    private Integer victimMasterID;

    @Column(name = "CaseMasterID", nullable = false)
    private Integer caseMasterID;

    @Column(name = "CrimeRegisteredDate", nullable = false)
    private LocalDate crimeRegisteredDate;

    @Column(name = "VictimName", length = 200)
    private String victimName;

    @Column(name = "AgeYear")
    private Integer ageYear;

    @Column(name = "GenderID")
    @Builder.Default
    private Integer genderID = 0;

    @Column(name = "VictimPolice")
    @Builder.Default
    private Boolean victimPolice = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "CaseMasterID", referencedColumnName = "CaseMasterID",
                    insertable = false, updatable = false),
        @JoinColumn(name = "CrimeRegisteredDate", referencedColumnName = "CrimeRegisteredDate",
                    insertable = false, updatable = false)
    })
    private CaseMaster caseMaster;
}
