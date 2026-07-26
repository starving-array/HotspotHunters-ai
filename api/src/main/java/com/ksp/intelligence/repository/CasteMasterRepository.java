package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CasteMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link CasteMaster} lookup table. */
@Repository
public interface CasteMasterRepository extends JpaRepository<CasteMaster, Integer> {
    Optional<CasteMaster> findByCasteMasterName(String casteMasterName);
}
