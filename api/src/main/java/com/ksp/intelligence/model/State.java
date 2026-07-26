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
 * JPA entity for the {@code State} lookup table (Phase 3a).
 * StateID is a SERIAL PK; seeded with Karnataka + neighbouring states.
 */
@Entity
@Table(name = "State")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class State {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "StateID")
    private Integer stateID;

    @Column(name = "StateName", length = 100, nullable = false)
    private String stateName;

    @Column(name = "NationalityID")
    @Builder.Default
    private Integer nationalityID = 1;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
