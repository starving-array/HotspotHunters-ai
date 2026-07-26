package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Accused;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link Accused} table. */
@Repository
public interface AccusedRepository extends JpaRepository<Accused, Integer> {
    List<Accused> findByCaseMasterID(Integer caseMasterID);
}
