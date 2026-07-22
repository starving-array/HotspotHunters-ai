package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Offender;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Spring Data JPA repo for {@link Offender}; used in Phase 3 by the network graph endpoint. */
@Repository
public interface OffenderRepository extends JpaRepository<Offender, String> {

    @Query(value = """
        SELECT offender_b FROM offender_network WHERE offender_a = :id
        UNION
        SELECT offender_a FROM offender_network WHERE offender_b = :id
    """, nativeQuery = true)
    List<String> findCoOffenders(@Param("id") String offenderId);
}
