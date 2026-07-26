package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CrimeSubHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link CrimeSubHead} lookup table. */
@Repository
public interface CrimeSubHeadRepository extends JpaRepository<CrimeSubHead, Integer> {
    List<CrimeSubHead> findByCrimeHead_CrimeHeadID(Integer crimeHeadID);
}
