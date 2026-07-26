package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Unit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/** Repository for the {@link Unit} (police station) table. */
@Repository
public interface UnitRepository extends JpaRepository<Unit, Integer> {
    Optional<Unit> findByStationCode(String stationCode);
    List<Unit> findByDistrict_DistrictID(Integer districtID);
}
