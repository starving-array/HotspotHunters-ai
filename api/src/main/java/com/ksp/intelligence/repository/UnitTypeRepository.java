package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.UnitType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for the {@link UnitType} lookup table. */
@Repository
public interface UnitTypeRepository extends JpaRepository<UnitType, Integer> {
}
