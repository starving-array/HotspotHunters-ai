package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.District;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Repository for the {@link District} table. */
@Repository
public interface DistrictRepository extends JpaRepository<District, Integer> {
    Optional<District> findByDistrictCode(String districtCode);
    Optional<District> findByDistrictName(String districtName);
}
