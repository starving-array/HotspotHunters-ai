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

import com.ksp.intelligence.model.domain.ChargesheetType;

import java.time.LocalDate;

/**
 * JPA entity for the {@code ChargesheetDetails} table (Phase 3a).
 * Linked to CaseMaster via composite FK {@code (CaseMasterID, CrimeRegisteredDate)}.
 * PolicePersonID FKs to Employee (the IO who filed the chargesheet).
 */
@Entity
@Table(name = "ChargesheetDetails")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ChargesheetDetails {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CSID")
    private Integer csid;

    @Column(name = "CaseMasterID", nullable = false)
    private Integer caseMasterID;

    @Column(name = "CrimeRegisteredDate", nullable = false)
    private LocalDate crimeRegisteredDate;

    /** null = TYPED column — JPA will send as start-of-day LocalDateTime. */
    @Column(name = "csdate")
    private LocalDate csdate;

    /** A = additional, default per init.sql CHECK (cstype). */
    @Column(name = "cstype")
    @Builder.Default
    private ChargesheetType cstype = ChargesheetType.A;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PolicePersonID")
    private Employee policePerson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "CaseMasterID", referencedColumnName = "CaseMasterID",
                    insertable = false, updatable = false),
        @JoinColumn(name = "CrimeRegisteredDate", referencedColumnName = "CrimeRegisteredDate",
                    insertable = false, updatable = false)
    })
    private CaseMaster caseMaster;
}
