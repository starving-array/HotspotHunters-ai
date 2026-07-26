package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CyberTrendAlert;
import com.ksp.intelligence.model.domain.CyberPatternType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CyberTrendAlertRepository extends JpaRepository<CyberTrendAlert, Integer> {
    List<CyberTrendAlert> findAllByOrderByLastSeenDesc();
    List<CyberTrendAlert> findByPatternType(CyberPatternType patternType);
}
