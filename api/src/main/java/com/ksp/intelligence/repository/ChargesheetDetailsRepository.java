package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.ChargesheetDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link ChargesheetDetails} table. */
@Repository
public interface ChargesheetDetailsRepository extends JpaRepository<ChargesheetDetails, Integer> {
    List<ChargesheetDetails> findByCaseMasterID(Integer caseMasterID);
}
