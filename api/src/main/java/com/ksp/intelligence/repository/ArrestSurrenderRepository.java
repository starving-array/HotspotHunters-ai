package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.ArrestSurrender;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link ArrestSurrender} table. */
@Repository
public interface ArrestSurrenderRepository extends JpaRepository<ArrestSurrender, Integer> {
    List<ArrestSurrender> findByAccused_AccusedMasterID(Integer accusedMasterID);
}
