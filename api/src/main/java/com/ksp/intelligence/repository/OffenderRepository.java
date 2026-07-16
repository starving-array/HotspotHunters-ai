package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Offender;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data JPA repo for {@link Offender}; used in Phase 3 by the network graph endpoint. */
@Repository
public interface OffenderRepository extends JpaRepository<Offender, String> { }
