package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Designation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for the {@link Designation} lookup table. */
@Repository
public interface DesignationRepository extends JpaRepository<Designation, Integer> {
}
