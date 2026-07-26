package com.ksp.intelligence.service;

import com.ksp.intelligence.dto.FirSearchResultDto;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class FirSearchService {

    private final EntityManager em;

    public FirSearchService(EntityManager em) {
        this.em = em;
    }

    @SuppressWarnings("unchecked")
    public List<FirSearchResultDto> search(String query) {
        StringBuilder sql = new StringBuilder(
            "SELECT c.casemasterid, c.crimeno, " +
            "CASE WHEN c.is_cybercrime THEN 'Cyber Crime' ELSE 'Other' END AS crimetype, " +
            "COALESCE(d.districtname, 'Unknown') AS district, " +
            "COALESCE(u.stationname, 'Unknown') AS station, " +
            "TO_CHAR(c.crimeregistereddate, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS regdate, " +
            "COALESCE(LEFT(c.brieffacts, 200), '') AS facts, " +
            "COALESCE(c.cyber_severity, 'low') AS severity " +
            "FROM casemaster c " +
            "LEFT JOIN unit u ON u.unitid = c.policestationid " +
            "LEFT JOIN district d ON d.districtid = u.districtid "
        );

        if (query != null && !query.isBlank()) {
            sql.append("WHERE c.crimeno ILIKE :q OR c.brieffacts ILIKE :q OR d.districtname ILIKE :q ");
        }
        sql.append("ORDER BY c.crimeregistereddate DESC LIMIT 50");

        var q = em.createNativeQuery(sql.toString());
        if (query != null && !query.isBlank()) {
            q.setParameter("q", "%" + query + "%");
        }

        List<FirSearchResultDto> results = new ArrayList<>();
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            results.add(FirSearchResultDto.builder()
                    .caseMasterId(((Number) row[0]).intValue())
                    .crimeNo((String) row[1])
                    .crimeType((String) row[2])
                    .district((String) row[3])
                    .policeStation((String) row[4])
                    .registeredDate((String) row[5])
                    .briefFacts((String) row[6])
                    .severity((String) row[7])
                    .build());
        }
        return results;
    }
}
