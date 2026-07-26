package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.TrendsDataDto;
import com.ksp.intelligence.model.FirRecord;
import com.ksp.intelligence.repository.FirRecordRepository;
import com.ksp.intelligence.service.TrendsService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;

@RestController
public class TrendController {

    private final FirRecordRepository firRepo;
    private final TrendsService trendsService;

    public TrendController(FirRecordRepository firRepo, TrendsService trendsService) {
        this.firRepo = firRepo;
        this.trendsService = trendsService;
    }

    /**
     * Returns monthly incident counts for a district over the last N months.
     *
     * @param districtCode district identifier (path variable)
     * @param months optional number of months to look back (default 12)
     * @return list of { "month": "YYYY‑MM", "count": number }
     */
    @GetMapping(value = "/api/v1/trends/{districtCode}", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<Map<String, Object>> getTrend(
            @PathVariable String districtCode,
            @RequestParam(value = "months", defaultValue = "12") int months) {
        if (months < 1) months = 1;
        Instant end = Instant.now();
        Instant start = end.minusSeconds(months * 30L * 24 * 60 * 60); // approx months
        List<FirRecord> records = firRepo.findByDistrictCodeAndIncidentTsBetween(districtCode, start, end);
        // Group by YearMonth
        var grouped = records.stream().collect(
                java.util.stream.Collectors.groupingBy(r -> {
                    Instant ts = r.getIncidentTs();
                    return YearMonth.from(ts.atZone(ZoneOffset.UTC));
                }, java.util.stream.Collectors.counting()));
        // Build ordered list
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < months; i++) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            long cnt = grouped.getOrDefault(ym, 0L);
            result.add(Map.of("month", ym.toString(), "count", cnt));
        }
        result.sort(Comparator.comparing(m -> (String) m.get("month")));
        return result;
    }

    @GetMapping(value = "/api/v1/trends/overview", produces = MediaType.APPLICATION_JSON_VALUE)
    public TrendsDataDto getTrendsOverview() {
        return trendsService.getTrends();
    }

    /**
     * Compare trends across multiple districts — single batch query.
     *
     * @param districts comma‑separated district codes (e.g. "01,02,03")
     * @param months optional months back (default 12)
     * @return list of { "district": "...", "month": "YYYY‑MM", "count": number }
     */
    @GetMapping(value = "/api/v1/trends/compare", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<Map<String, Object>> compareTrends(
            @RequestParam(value = "districts") String districts,
            @RequestParam(value = "months", defaultValue = "12") int months) {
        if (months < 1) months = 1;
        Instant end = Instant.now();
        Instant start = end.minusSeconds(months * 30L * 24 * 60 * 60);

        List<String> districtCodes = Arrays.stream(districts.split(","))
                .map(String::trim).toList();
        List<FirRecord> records = firRepo.findByDistrictCodeInAndIncidentTsBetween(districtCodes, start, end);

        // Group by (district, YearMonth)
        Map<String, Map<YearMonth, Long>> grouped = new HashMap<>();
        for (FirRecord r : records) {
            YearMonth ym = YearMonth.from(r.getIncidentTs().atZone(ZoneOffset.UTC));
            grouped.computeIfAbsent(r.getDistrictCode(), k -> new HashMap<>())
                    .merge(ym, 1L, Long::sum);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (String dc : districtCodes) {
            Map<YearMonth, Long> byMonth = grouped.getOrDefault(dc, Map.of());
            for (int i = 0; i < months; i++) {
                YearMonth ym = YearMonth.now().minusMonths(i);
                result.add(Map.of("district", dc, "month", ym.toString(), "count", byMonth.getOrDefault(ym, 0L)));
            }
        }
        result.sort(Comparator.<Map<String, Object>, String>comparing(m -> (String) m.get("month"))
                .thenComparing(m -> (String) m.get("district")));
        return result;
    }
}
