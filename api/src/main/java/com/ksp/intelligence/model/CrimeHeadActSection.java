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
 * JPA entity for the {@code CrimeHeadActSection} junction table (Phase 3a).
 *
 * <p>Maps {@code CrimeHead ↔ (Act, Section)}. Composite PK on
 * {@code (CrimeHeadID, ActCode, SectionCode)}; FK {@code (ActCode, SectionCode)}
 * → {@code Section(ActCode, SectionCode)}.</p>
 */
@Entity
@Table(name = "CrimeHeadActSection")
@IdClass(CrimeHeadActSection.Key.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrimeHeadActSection {

    @Id
    @Column(name = "CrimeHeadID", nullable = false)
    private Integer crimeHeadID;

    @Id
    @Column(name = "ActCode", length = 20, nullable = false)
    private String actCode;

    @Id
    @Column(name = "SectionCode", length = 20, nullable = false)
    private String sectionCode;

    /** Read-only link to CrimeHead. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CrimeHeadID", insertable = false, updatable = false)
    private CrimeHead crimeHead;

    /** Read-only link to Section (composite PK). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "ActCode", referencedColumnName = "ActCode",
                    insertable = false, updatable = false),
        @JoinColumn(name = "SectionCode", referencedColumnName = "SectionCode",
                    insertable = false, updatable = false)
    })
    private Section section;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private static final long serialVersionUID = 1L;
        private Integer crimeHeadID;
        private String actCode;
        private String sectionCode;
    }
}
