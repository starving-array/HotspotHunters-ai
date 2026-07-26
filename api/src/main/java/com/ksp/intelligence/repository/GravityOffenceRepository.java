package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.GravityOffence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link GravityOffence} lookup table. */
@Repository
public interface GravityOffenceRepository extends JpaRepository<GravityOffence, Integer> {
    Optional<GravityOffence> findByLookupValue(String lookupValue);
}
