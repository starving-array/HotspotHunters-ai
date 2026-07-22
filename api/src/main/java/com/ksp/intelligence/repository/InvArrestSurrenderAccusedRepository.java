package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.InvArrestSurrenderAccused;
import com.ksp.intelligence.model.InvArrestSurrenderAccused.Key;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface InvArrestSurrenderAccusedRepository extends JpaRepository<InvArrestSurrenderAccused, Key> {

    @Query("SELECT i.arrestSurrenderId FROM InvArrestSurrenderAccused i WHERE i.accusedMasterId = :accusedId")
    List<Integer> findArrestSurrenderIdsByAccusedMasterId(@Param("accusedId") Integer accusedId);

    @Query("SELECT i.accusedMasterId FROM InvArrestSurrenderAccused i WHERE i.arrestSurrenderId = :arrestId")
    List<Integer> findAccusedIdsByArrestSurrenderId(@Param("arrestId") Integer arrestId);
}
