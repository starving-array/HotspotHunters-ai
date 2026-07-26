package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.ReligionMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link ReligionMaster} lookup table. */
@Repository
public interface ReligionMasterRepository extends JpaRepository<ReligionMaster, Integer> {
    Optional<ReligionMaster> findByReligionName(String religionName);
}
