package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Rank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for the {@link Rank} lookup table. */
@Repository
public interface RankRepository extends JpaRepository<Rank, Integer> {
}
