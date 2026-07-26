package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
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
 * JPA entity for the {@code Section} table (IPC / IT Act / NDPS sections).
 *
 * <p>Composite PK {@code (ActCode, SectionCode)}. {@code ActCode} is both part
 * of the PK and a FK to {@code Act}. The builder accepts the two string keys
 * directly — applications should use {@link #builder()} rather than relying
 * on a separate {@code SectionKey} class.</p>
 */
@Entity
@Table(name = "Section")
@IdClass(Section.Key.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Section {

    @Id
    @Column(name = "ActCode", length = 20, nullable = false)
    private String actCode;

    @Id
    @Column(name = "SectionCode", length = 20, nullable = false)
    private String sectionCode;

    @Column(name = "SectionDescription", length = 500)
    private String sectionDescription;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ActCode", insertable = false, updatable = false)
    private Act act;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private static final long serialVersionUID = 1L;
        private String actCode;
        private String sectionCode;
    }
}
