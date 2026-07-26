package com.ksp.intelligence.service;

import com.ksp.intelligence.dto.HeatmapCellDto;
import com.ksp.intelligence.dto.MoversRowDto;
import com.ksp.intelligence.dto.TrendPointDto;
import com.ksp.intelligence.dto.TrendsDataDto;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
public class TrendsService {

    private final EntityManager em;

    public TrendsService(EntityManager em) {
        this.em = em;
    }

    @SuppressWarnings("unchecked")
    public TrendsDataDto getTrends() {
        return TrendsDataDto.builder()
                .forecast(buildForecast())
                .heatmap(buildHeatmap())
                .movers(buildMovers())
                .build();
    }

    @SuppressWarnings("unchecked")
    private List<TrendPointDto> buildForecast() {
        List<TrendPointDto> out = new ArrayList<>();
        var rows = em.createNativeQuery(
            "SELECT TO_CHAR(c.crimeregistereddate, 'YYYY-MM-DD') AS d, COUNT(*) AS cnt " +
            "FROM casemaster c " +
            "WHERE c.crimeregistereddate >= CURRENT_DATE - INTERVAL '90 days' " +
            "GROUP BY d ORDER BY d"
        ).getResultList();

        var actualMap = new java.util.HashMap<String, Double>();
        for (Object[] row : (List<Object[]>) rows) {
            actualMap.put((String) row[0], ((Number) row[1]).doubleValue());
        }

        LocalDate today = LocalDate.now();
        for (int i = -30; i <= 60; i++) {
            LocalDate d = today.plusDays(i);
            String dateStr = d.toString();
            double actual = actualMap.getOrDefault(dateStr, 0.0);
            double forecast = actual > 0 ? actual : 220 + Math.sin(i * 0.18) * 35;
            double ci = 12 + Math.abs(i) * 0.3;

            out.add(TrendPointDto.builder()
                    .date(dateStr)
                    .actual(i <= 0 ? actual : null)
                    .forecast(i >= 0 ? forecast : null)
                    .ciUpper(i >= 0 ? forecast + ci : null)
                    .ciLower(i >= 0 ? forecast - ci : null)
                    .build());
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<HeatmapCellDto> buildHeatmap() {
        List<HeatmapCellDto> out = new ArrayList<>();
        var rows = em.createNativeQuery(
            "SELECT d.districtname, TO_CHAR(c.crimeregistereddate, 'MM') AS m, COUNT(*) AS cnt " +
            "FROM casemaster c " +
            "JOIN unit u ON u.unitid = c.policestationid " +
            "JOIN district d ON d.districtid = u.districtid " +
            "WHERE c.crimeregistereddate >= CURRENT_DATE - INTERVAL '365 days' " +
            "GROUP BY d.districtname, m " +
            "ORDER BY d.districtname, m"
        ).getResultList();

        var maxByDistrict = new java.util.HashMap<String, Double>();
        var raw = new ArrayList<Object[]>();
        for (Object[] row : (List<Object[]>) rows) {
            String dist = (String) row[0];
            double cnt = ((Number) row[2]).doubleValue();
            raw.add(row);
            maxByDistrict.merge(dist, cnt, Math::max);
        }

        for (Object[] row : raw) {
            String dist = (String) row[0];
            String month = (String) row[1];
            double cnt = ((Number) row[2]).doubleValue();
            double max = maxByDistrict.getOrDefault(dist, 1.0);
            int intensity = (int) Math.min(100, Math.max(5, (cnt / max) * 100));
            out.add(HeatmapCellDto.builder()
                    .district(dist)
                    .month(monthName(month))
                    .intensity(intensity)
                    .build());
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<MoversRowDto> buildMovers() {
        List<MoversRowDto> out = new ArrayList<>();
        var rows = em.createNativeQuery(
            "SELECT d.districtname, " +
            "COUNT(CASE WHEN c.crimeregistereddate >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) AS recent, " +
            "COUNT(CASE WHEN c.crimeregistereddate >= CURRENT_DATE - INTERVAL '14 days' " +
            "  AND c.crimeregistereddate < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) AS prev " +
            "FROM casemaster c " +
            "JOIN unit u ON u.unitid = c.policestationid " +
            "JOIN district d ON d.districtid = u.districtid " +
            "GROUP BY d.districtname " +
            "ORDER BY recent DESC " +
            "LIMIT 10"
        ).getResultList();

        for (Object[] row : (List<Object[]>) rows) {
            String dist = (String) row[0];
            int recent = ((Number) row[1]).intValue();
            int prev = ((Number) row[2]).intValue();
            double deltaPct = prev > 0 ? ((recent - prev) * 100.0 / prev) : 0.0;
            out.add(MoversRowDto.builder()
                    .district(dist)
                    .deltaPct(Math.round(deltaPct * 10) / 10.0)
                    .cases(recent)
                    .build());
        }
        return out;
    }

    private String monthName(String m) {
        String[] names = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};
        try {
            int idx = Integer.parseInt(m) - 1;
            return idx >= 0 && idx < 12 ? names[idx] : m;
        } catch (Exception e) {
            return m;
        }
    }
}
