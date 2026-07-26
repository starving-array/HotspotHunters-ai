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
 * JPA entity for the {@code Rank} lookup table (Phase 3a).
 * Hierarchy: 1 = Inspector General (top), 10 = Constable (bottom).
 */
@Entity
@Table(name = "Rank")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Rank {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RankID")
    private Integer rankID;

    @Column(name = "RankName", length = 100, nullable = false)
    private String rankName;

    @Column(name = "Hierarchy")
    private Integer hierarchy;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
