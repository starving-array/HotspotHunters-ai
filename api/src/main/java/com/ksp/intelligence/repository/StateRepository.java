package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.State;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link State} lookup table. */
@Repository
public interface StateRepository extends JpaRepository<State, Integer> {
    Optional<State> findByStateName(String stateName);
}
