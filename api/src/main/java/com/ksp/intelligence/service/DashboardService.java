package com.ksp.intelligence.service;

import com.ksp.intelligence.dto.DashboardKpiDto;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class DashboardService {

    private final EntityManager em;

    public DashboardService(EntityManager em) {
        this.em = em;
    }

    public List<DashboardKpiDto> getKpis() {
        long firsToday = countNative("SELECT COUNT(*) FROM casemaster WHERE crimeregistereddate = CURRENT_DATE");
        long activeCases = countNative("SELECT COUNT(*) FROM casemaster WHERE casestatusid = 1");
        long heinous = countNative("SELECT COUNT(*) FROM casemaster c WHERE c.is_cybercrime = true AND c.cyber_severity = 'critical'");
        long totalCases = countNative("SELECT COUNT(*) FROM casemaster");
        long chargeSheeted = countNative("SELECT COUNT(DISTINCT casemasterid) FROM chargesheetdetails");
        long clearanceRate = totalCases > 0 ? (chargeSheeted * 100 / totalCases) : 0;

        return List.of(
                DashboardKpiDto.builder().label("FIRs Today").value(firsToday).delta("live").trend("up").icon("fir").build(),
                DashboardKpiDto.builder().label("Active Cases").value(activeCases).delta("").trend("flat").icon("active").build(),
                DashboardKpiDto.builder().label("Heinous Crimes").value(heinous).delta("critical").trend("flat").icon("heinous").severity("critical").build(),
                DashboardKpiDto.builder().label("Clearance Rate").value(clearanceRate + "%").delta(chargeSheeted + " / " + totalCases).trend("flat").icon("clearance").build()
        );
    }

    private long countNative(String sql) {
        Number result = (Number) em.createNativeQuery(sql).getSingleResult();
        return result.longValue();
    }
}
