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
import java.time.LocalDateTime;

/**
 * JPA entity for the {@code ComplainantDetails} table (Phase 3a).
 * Linked to CaseMaster via composite FK {@code (CaseMasterID, CrimeRegisteredDate)}.
 * The CasteID, ReligionID, OccupationID FK columns are added by migration 007.
 */
@Entity
@Table(name = "ComplainantDetails")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ComplainantDetails {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ComplainantID")
    private Integer complainantID;

    @Column(name = "CaseMasterID", nullable = false)
    private Integer caseMasterID;

    @Column(name = "CrimeRegisteredDate", nullable = false)
    private LocalDate crimeRegisteredDate;

    @Column(name = "ComplainantName", length = 200)
    private String complainantName;

    @Column(name = "AgeYear")
    private Integer ageYear;

    @Column(name = "GenderID")
    @Builder.Default
    private Integer genderID = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CasteID")
    private CasteMaster caste;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ReligionID")
    private ReligionMaster religion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "OccupationID")
    private OccupationMaster occupation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "CaseMasterID", referencedColumnName = "CaseMasterID",
                    insertable = false, updatable = false),
        @JoinColumn(name = "CrimeRegisteredDate", referencedColumnName = "CrimeRegisteredDate",
                    insertable = false, updatable = false)
    })
    private CaseMaster caseMaster;
}
