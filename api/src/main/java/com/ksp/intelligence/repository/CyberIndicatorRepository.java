package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CyberIndicator;
import com.ksp.intelligence.model.domain.IndicatorType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface CyberIndicatorRepository extends JpaRepository<CyberIndicator, Integer> {
    List<CyberIndicator> findByCasemasterId(Integer casemasterId);
    long countByIndicatorType(IndicatorType indicatorType);

    @Query(value = "SELECT DISTINCT i.indicator_type, i.indicator_value FROM cyber_indicators i", nativeQuery = true)
    List<Object[]> findDistinctIndicatorTypeAndValue();
}
