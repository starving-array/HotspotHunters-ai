package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/**
 * JPA entity for the {@code ActSectionAssociation} junction table (Phase 3a).
 *
 * <p>Links CaseMaster ↔ (Act, Section) many-to-many. Composite PK on
 * {@code (CaseMasterID, ActID, SectionID)}; unique FK constraint
 * {@code (ActID, SectionID) → Section(ActCode, SectionCode)}.</p>
 *
 * <p>{@code ActID} and {@code SectionID} are the joining column names
 * (matching init.sql §15f) — they reference the {@code Section} table's
 * composite key {@code (ActCode, SectionCode)} via a composite FK.</p>
 */
@Entity
@Table(name = "ActSectionAssociation")
@IdClass(ActSectionAssociation.Key.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActSectionAssociation {

    @Id
    @Column(name = "CaseMasterID", nullable = false)
    private Integer caseMasterID;

    @Id
    @Column(name = "ActID", length = 20, nullable = false)
    private String actID;

    @Id
    @Column(name = "SectionID", length = 20, nullable = false)
    private String sectionID;

    @Column(name = "ActOrderID")
    @Builder.Default
    private Integer actOrderID = 1;

    @Column(name = "SectionOrderID")
    @Builder.Default
    private Integer sectionOrderID = 1;

    /** Read-only link to the Section composite-PK table. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "ActID", referencedColumnName = "ActCode",
                    insertable = false, updatable = false),
        @JoinColumn(name = "SectionID", referencedColumnName = "SectionCode",
                    insertable = false, updatable = false)
    })
    private Section section;

    /** Composite-key class — must be Serializable and override equals/hashCode. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private static final long serialVersionUID = 1L;
        private Integer caseMasterID;
        private String actID;
        private String sectionID;
    }
}
