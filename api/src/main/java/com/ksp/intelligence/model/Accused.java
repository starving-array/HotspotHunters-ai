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
 * JPA entity for the {@code Accused} table (Phase 3b restructure).
 *
 * <p>Originally had only AccusedMasterID + Name + PoliceStationID.
 * Migration 004 added CaseMasterID (FK to CaseMaster), AgeYear, GenderID,
 * and PersonID (the per-case serial A1/A2/A3...). The CaseMaster link is
 * a uni-directional ManyToOne using {@code JoinColumns} because CaseMaster
 * has a composite PK.</p>
 *
 * <p>The existing {@link InvArrestSurrenderAccused} junction entity still
 * references this table via AccusedMasterID.</p>
 */
@Entity
@Table(name = "Accused")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Accused {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "AccusedMasterID")
    private Integer accusedMasterID;

    @Column(name = "Name", length = 200)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PoliceStationID")
    private Unit policeStation;

    @Column(name = "CaseMasterID")
    private Integer caseMasterID;

    @Column(name = "AgeYear")
    private Integer ageYear;

    @Column(name = "GenderID")
    @Builder.Default
    private Integer genderID = 0;

    /** Per-case serial: A1, A2, A3 ... */
    @Column(name = "PersonID", length = 10)
    private String personID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PoliceStationID", insertable = false, updatable = false)
    private Unit policeStationRef;
}
