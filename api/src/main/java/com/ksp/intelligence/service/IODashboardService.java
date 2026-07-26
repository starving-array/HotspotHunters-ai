package com.ksp.intelligence.service;

import com.ksp.intelligence.dto.IODashboardDataDto;
import com.ksp.intelligence.dto.IOKpiDto;
import com.ksp.intelligence.dto.IORowDto;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class IODashboardService {

    private final EntityManager em;

    public IODashboardService(EntityManager em) {
        this.em = em;
    }

    @SuppressWarnings("unchecked")
    public IODashboardDataDto getIODashboard() {
        List<IORowDto> leaderboard = new ArrayList<>();

        var rows = em.createNativeQuery(
            "SELECT e.employeeid, e.firstname, " +
            "COALESCE(r.rankname, 'Officer') AS rankname, " +
            "COALESCE(u.stationname, 'Unknown') AS unitname, " +
            "COUNT(DISTINCT c.casemasterid) AS casescount, " +
            "COUNT(DISTINCT a.accusedmasterid) AS arrestscount " +
            "FROM employee e " +
            "LEFT JOIN rank r ON r.rankid = e.rankid " +
            "LEFT JOIN unit u ON u.unitid = e.unitid " +
            "LEFT JOIN casemaster c ON c.policepersonid = e.employeeid " +
            "LEFT JOIN accused a ON a.casemasterid = c.casemasterid " +
            "WHERE c.casemasterid IS NOT NULL " +
            "GROUP BY e.employeeid, e.firstname, r.rankname, u.stationname " +
            "ORDER BY casescount DESC " +
            "LIMIT 10"
        ).getResultList();

        int totalCases = 0;
        int totalArrests = 0;
        int topArrestRate = 0;
        int activeIOs = 0;

        for (Object[] row : (List<Object[]>) rows) {
            int employeeId = ((Number) row[0]).intValue();
            String firstName = (String) row[1];
            String rankName = (String) row[2];
            String unitName = (String) row[3];
            int casesCount = ((Number) row[4]).intValue();
            int arrestsCount = ((Number) row[5]).intValue();
            int clearanceRate = casesCount > 0 ? (arrestsCount * 100 / casesCount) : 0;

            totalCases += casesCount;
            totalArrests += arrestsCount;
            topArrestRate = Math.max(topArrestRate, clearanceRate);
            activeIOs++;

            leaderboard.add(IORowDto.builder()
                    .employeeId(employeeId)
                    .firstName(firstName)
                    .rankName(rankName)
                    .unitName(unitName)
                    .casesCount(casesCount)
                    .arrestsCount(arrestsCount)
                    .clearanceRate(clearanceRate)
                    .build());
        }

        IOKpiDto kpis = IOKpiDto.builder()
                .activeIOs(activeIOs)
                .avgCasesPerIO(activeIOs > 0 ? totalCases / activeIOs : 0)
                .topArrestRate(topArrestRate)
                .build();

        return IODashboardDataDto.builder()
                .kpis(kpis)
                .leaderboard(leaderboard)
                .build();
    }
}
