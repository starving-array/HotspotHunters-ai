package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.OccupationMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link OccupationMaster} lookup table. */
@Repository
public interface OccupationMasterRepository extends JpaRepository<OccupationMaster, Integer> {
    Optional<OccupationMaster> findByOccupationName(String occupationName);
}
