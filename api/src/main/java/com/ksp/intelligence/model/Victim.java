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

import java.time.Instant;
import java.util.Objects;

/** JPA entity for {@code victims} — PII-minimised: age_group + gender only. */
@Entity
@Table(name = "victims")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Victim {

    @Id
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Victim victim = (Victim) o;
        return Objects.equals(victimId, victim.victimId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(victimId);
    }
}
