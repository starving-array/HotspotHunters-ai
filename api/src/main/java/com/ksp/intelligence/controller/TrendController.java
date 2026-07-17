package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.FirRecord;
import com.ksp.intelligence.repository.FirRecordRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class TrendController {

    private final FirRecordRepository firRepo;

    public TrendController(FirRecordRepository firRepo) {
        this.firRepo = firRepo;
    }

    /**
     * Returns monthly incident counts for a district over the last 12 months.
     *
+     * @param districtCode district identifier (path variable)
+     * @param months optional number of months to look back (default 12)
+     * @return list of { "month": "YYYY‑MM", "count": number }
+     */
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
        return java.util.stream.IntStream.rangeClosed(0, months - 1)
                .mapToObj(i -> {
                    YearMonth ym = YearMonth.now().minusMonths(i);
                    long cnt = grouped.getOrDefault(ym, 0L);
                    return Map.of("month", ym.toString(), "count", cnt);
                })
                .sorted((a, b) -> ((String) a.get("month")).compareTo((String) b.get("month")))
                .collect(java.util.stream.Collectors.<Map<String, Object>>toList());
    }
}
