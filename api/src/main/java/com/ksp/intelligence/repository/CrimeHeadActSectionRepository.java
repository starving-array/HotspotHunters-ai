package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CrimeHeadActSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link CrimeHeadActSection} junction table. */
@Repository
public interface CrimeHeadActSectionRepository
        extends JpaRepository<CrimeHeadActSection, CrimeHeadActSection.Key> {
    List<CrimeHeadActSection> findByCrimeHeadID(Integer crimeHeadID);
}
