package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CaseMaster;
import com.ksp.intelligence.model.CaseMasterKey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CaseMasterRepository extends JpaRepository<CaseMaster, CaseMasterKey> {
    Optional<CaseMaster> findByCrimeNo(String crimeNo);
}