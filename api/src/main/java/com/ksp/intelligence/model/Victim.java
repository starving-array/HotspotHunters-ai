package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
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


/** JPA entity for {@code victims} — PII-minimised: age_group + gender only. */
@Entity
@Table(name = "victims")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Victim {

    @Id
    @EqualsAndHashCode.Include
    @Column(name = "victim_id", length = 20, nullable = false, updatable = false)
    private String victimId;

    @Column(name = "age_group", length = 20)
    private String ageGroup;

    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    @Builder.Default
    private Instant createdAt = Instant.now();


}
