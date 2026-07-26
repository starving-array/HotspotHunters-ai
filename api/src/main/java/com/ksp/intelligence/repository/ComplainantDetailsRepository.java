package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.ComplainantDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link ComplainantDetails} table. */
@Repository
public interface ComplainantDetailsRepository extends JpaRepository<ComplainantDetails, Integer> {
    List<ComplainantDetails> findByCaseMasterID(Integer caseMasterID);
}
