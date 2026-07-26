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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

/**
 * JPA entity for the {@code CrimeSubHead} lookup table (Phase 3a).
 * FK to CrimeHead; e.g. Murder, Robbery, Cyber Fraud.
 */
@Entity
@Table(name = "CrimeSubHead")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CrimeSubHead {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CrimeSubHeadID")
    private Integer crimeSubHeadID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CrimeHeadID", nullable = false)
    private CrimeHead crimeHead;

    @Column(name = "CrimeHeadName", length = 200, nullable = false)
    private String crimeHeadName;

    @Column(name = "SeqID")
    @Builder.Default
    private Integer seqID = 0;
}
