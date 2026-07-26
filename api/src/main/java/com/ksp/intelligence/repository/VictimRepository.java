package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Victim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the restructured {@link Victim} table (Phase 3b). */
@Repository
public interface VictimRepository extends JpaRepository<Victim, Integer> {
    List<Victim> findByCaseMasterID(Integer caseMasterID);
}
