package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CaseCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link CaseCategory} lookup table. */
@Repository
public interface CaseCategoryRepository extends JpaRepository<CaseCategory, Integer> {
    Optional<CaseCategory> findByLookupValue(String lookupValue);
}
