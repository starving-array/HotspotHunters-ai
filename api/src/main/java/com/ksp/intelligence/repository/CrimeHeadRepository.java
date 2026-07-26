package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CrimeHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link CrimeHead} lookup table. */
@Repository
public interface CrimeHeadRepository extends JpaRepository<CrimeHead, Integer> {
    Optional<CrimeHead> findByCrimeGroupName(String crimeGroupName);
}
