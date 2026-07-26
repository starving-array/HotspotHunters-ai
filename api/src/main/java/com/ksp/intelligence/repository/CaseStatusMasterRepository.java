package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CaseStatusMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link CaseStatusMaster} lookup table. */
@Repository
public interface CaseStatusMasterRepository extends JpaRepository<CaseStatusMaster, Integer> {
    Optional<CaseStatusMaster> findByCaseStatusName(String caseStatusName);
}
