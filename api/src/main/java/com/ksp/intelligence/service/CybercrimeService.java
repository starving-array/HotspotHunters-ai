package com.ksp.intelligence.service;

import com.ksp.intelligence.dto.CyberDashboardData;
import com.ksp.intelligence.dto.CyberKpi;
import com.ksp.intelligence.dto.MapAlertDto;
import com.ksp.intelligence.dto.PatternAlertDto;
import com.ksp.intelligence.model.CyberTrendAlert;
import com.ksp.intelligence.repository.CaseMasterRepository;
import com.ksp.intelligence.repository.CyberTrendAlertRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class CybercrimeService {

    private final CaseMasterRepository caseMasterRepo;
    private final CyberTrendAlertRepository trendAlertRepo;

    public CybercrimeService(CaseMasterRepository caseMasterRepo,
                             CyberTrendAlertRepository trendAlertRepo) {
        this.caseMasterRepo = caseMasterRepo;
        this.trendAlertRepo = trendAlertRepo;
    }

    public CyberDashboardData getDashboard() {
        long itActCases = caseMasterRepo.countByIsCybercrimeTrue();
        long financialFraud = caseMasterRepo.countFinancialFraud();
        long identityTheft = caseMasterRepo.countIdentityTheft();

        CyberKpi kpis = CyberKpi.builder()
                .itActCases(itActCases)
                .financialFraud(financialFraud)
                .identityTheft(identityTheft)
                .build();

        List<MapAlertDto> alerts = getMapAlerts();
        List<PatternAlertDto> patterns = getPatterns();

        return CyberDashboardData.builder()
                .kpis(kpis)
                .alerts(alerts)
                .patterns(patterns)
                .build();
    }

    public List<MapAlertDto> getMapAlerts() {
        List<Object[]> rows = caseMasterRepo.findCybercrimeMapAlerts();
        return rows.stream().map(r -> {
            Integer caseMasterId = ((Number) r[0]).intValue();
            String crimeNo = (String) r[1];
            Double lat = r[2] != null ? ((Number) r[2]).doubleValue() : null;
            Double lng = r[3] != null ? ((Number) r[3]).doubleValue() : null;
            String severity = (String) r[4];
            String district = (String) r[5];
            LocalDate regDate = r[6] != null ? ((java.sql.Date) r[6]).toLocalDate() : LocalDate.now();

            return MapAlertDto.builder()
                    .id("CM-" + caseMasterId)
                    .caseMasterId(caseMasterId)
                    .crimeNo(crimeNo)
                    .crimeType("Cyber Crime")
                    .district(district != null ? district : "Unknown")
                    .latitude(lat)
                    .longitude(lng)
                    .severity(severity != null ? severity : "medium")
                    .timestamp(regDate.atStartOfDay().toString())
                    .build();
        }).toList();
    }

    public List<PatternAlertDto> getPatterns() {
        List<CyberTrendAlert> alerts = trendAlertRepo.findAllByOrderByLastSeenDesc();
        return alerts.stream().map(a -> PatternAlertDto.builder()
                .alertId(a.getAlertId())
                .patternType(a.getPatternType().dbValue())
                .entityType(a.getEntityType())
                .entityValue(a.getEntityValue())
                .caseCount(a.getCaseCount())
                .threatLevel(a.getThreatLevel().dbValue())
                .build()).toList();
    }
}
