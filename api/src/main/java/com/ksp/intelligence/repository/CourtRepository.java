package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Court;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link Court} lookup table. */
@Repository
public interface CourtRepository extends JpaRepository<Court, Integer> {
    List<Court> findByDistrict_DistrictID(Integer districtID);
}
