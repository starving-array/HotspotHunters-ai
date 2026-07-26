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
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

import java.time.Instant;
import java.time.LocalDate;

/**
 * JPA entity for the {@code ArrestSurrender} table (Phase 3b restructure).
 *
 * <p>Migration 004 added the ER-compliance columns: ArrestSurrenderTypeID,
 * ArrestSurrenderDate, ArrestSurrenderStateId, ArrestSurrenderDistrictId,
 * IOID (Employee FK), CourtID (Court FK), AccusedMasterID (Accused FK),
 * IsAccused, IsComplainantAccused. The pre-existing ArrestDate and
 * PoliceStationID columns are kept for backward compatibility with
 * earlier-phase Kafka payloads.</p>
 */
@Entity
@Table(name = "ArrestSurrender")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ArrestSurrender {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ArrestSurrenderID")
    private Integer arrestSurrenderID;

    /** Legacy column from Phase 1 — kept verbatim. */
    @Column(name = "ArrestDate")
    @Temporal(TemporalType.TIMESTAMP)
    private Instant arrestDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PoliceStationID")
    private Unit policeStation;

    // ---- ER-compliance additions (migration 004) ----

    @Column(name = "ArrestSurrenderTypeID")
    @Builder.Default
    private Integer arrestSurrenderTypeID = 1;

    @Column(name = "ArrestSurrenderDate")
    private LocalDate arrestSurrenderDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ArrestSurrenderStateId")
    private State arrestSurrenderState;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ArrestSurrenderDistrictId")
    private District arrestSurrenderDistrict;

    /** Investigating Officer who processed the arrest. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "IOID")
    private Employee io;

    /** Court where the arrest/surrender is recorded. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CourtID")
    private Court court;

    /** The accused this record relates to. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AccusedMasterID")
    private Accused accused;

    @Column(name = "IsAccused")
    @Builder.Default
    private Boolean isAccused = true;

    @Column(name = "IsComplainantAccused")
    @Builder.Default
    private Boolean isComplainantAccused = false;
}
