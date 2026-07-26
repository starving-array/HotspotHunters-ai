package com.ksp.intelligence.service;

import com.ksp.intelligence.dto.CrimeTypeBreakdownItem;
import com.ksp.intelligence.dto.HotspotDetailDto;
import com.ksp.intelligence.dto.MonthlyTrendPoint;
import com.ksp.intelligence.dto.PoliceStationSummary;
import com.ksp.intelligence.dto.RecentAlert;
import com.ksp.intelligence.model.FirRecord;
import com.ksp.intelligence.repository.DistrictRepository;
import com.ksp.intelligence.repository.FirRecordRepository;
import com.ksp.intelligence.repository.UnitRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class HotspotService {

    private final StringRedisTemplate redisTemplate;
    private final FirRecordRepository firRepo;
    private final DistrictRepository districtRepo;
    private final UnitRepository unitRepo;

    @Value("${ksp.redis.keys.district-names:district:names}")
    private String districtNamesKey;

    public HotspotService(StringRedisTemplate redisTemplate,
                          FirRecordRepository firRepo,
                          DistrictRepository districtRepo,
                          UnitRepository unitRepo) {
        this.redisTemplate = redisTemplate;
        this.firRepo = firRepo;
        this.districtRepo = districtRepo;
        this.unitRepo = unitRepo;
    }

    public HotspotDetailDto getDistrictDetail(String districtCode) {
        Instant now = Instant.now();
        Instant weekAgo = now.minusSeconds(7L * 24 * 60 * 60);
        Instant twoWeeksAgo = now.minusSeconds(14L * 24 * 60 * 60);
        Instant monthAgo = now.minusSeconds(30L * 24 * 60 * 60);
        Instant sevenMonthsAgo = now.minusSeconds(7L * 30 * 24 * 60 * 60);

        List<FirRecord> twoWeekRecords = firRepo.findByDistrictCodeAndIncidentTsBetween(districtCode, twoWeeksAgo, now);
        List<FirRecord> monthRecords = firRepo.findByDistrictCodeAndIncidentTsBetween(districtCode, monthAgo, now);
        List<FirRecord> trendRecords = firRepo.findByDistrictCodeAndIncidentTsBetween(districtCode, sevenMonthsAgo, now);

        long currentWeek = twoWeekRecords.stream().filter(r -> !r.getIncidentTs().isBefore(weekAgo)).count();
        long previousWeek = twoWeekRecords.stream().filter(r -> r.getIncidentTs().isBefore(weekAgo)).count();
        double trendPct = previousWeek > 0 ? ((double) (currentWeek - previousWeek) / previousWeek) * 100 : 0;
        long totalCases = currentWeek + previousWeek;

        String name = resolveDistrictName(districtCode);

        List<CrimeTypeBreakdownItem> breakdown = buildCrimeTypeBreakdown(monthRecords);
        List<MonthlyTrendPoint> monthlyTrend = buildMonthlyTrend(trendRecords);
        List<PoliceStationSummary> topStations = buildTopPoliceStations(monthRecords);
        List<RecentAlert> recentAlerts = buildRecentAlerts(twoWeekRecords);

        return HotspotDetailDto.builder()
                .name(name)
                .totalCases((int) totalCases)
                .trendPct(Math.round(trendPct * 10.0) / 10.0)
                .crimeTypeBreakdown(breakdown)
                .monthlyTrend(monthlyTrend)
                .topPoliceStations(topStations)
                .recentAlerts(recentAlerts)
                .build();
    }

    public Map<String, Double> getHotspotTrends(List<String> districtCodes) {
        if (districtCodes.isEmpty()) return Map.of();
        Instant now = Instant.now();
        Instant weekAgo = now.minusSeconds(7L * 24 * 60 * 60);
        Instant twoWeeksAgo = now.minusSeconds(14L * 24 * 60 * 60);

        List<FirRecord> records = firRepo.findByDistrictCodeInAndIncidentTsBetween(districtCodes, twoWeeksAgo, now);
        Map<String, List<FirRecord>> byDistrict = records.stream()
                .collect(Collectors.groupingBy(FirRecord::getDistrictCode));

        Map<String, Double> trends = new HashMap<>();
        for (String code : districtCodes) {
            List<FirRecord> distRecords = byDistrict.getOrDefault(code, List.of());
            long current = distRecords.stream().filter(r -> !r.getIncidentTs().isBefore(weekAgo)).count();
            long previous = distRecords.stream().filter(r -> r.getIncidentTs().isBefore(weekAgo)).count();
            double trendPct = previous > 0 ? ((double) (current - previous) / previous) * 100 : 0;
            trends.put(code, Math.round(trendPct * 10.0) / 10.0);
        }
        return trends;
    }

    private String resolveDistrictName(String districtCode) {
        String name = (String) redisTemplate.opsForHash().get(districtNamesKey, districtCode);
        if (name == null || name.isBlank()) {
            name = districtRepo.findByDistrictCode(districtCode)
                    .map(d -> d.getDistrictName())
                    .orElse(districtCode);
        }
        return name;
    }

    private List<CrimeTypeBreakdownItem> buildCrimeTypeBreakdown(List<FirRecord> records) {
        Map<String, Long> crimeTypeCounts = records.stream()
                .collect(Collectors.groupingBy(FirRecord::getCrimeType, Collectors.counting()));
        long total = Math.max(crimeTypeCounts.values().stream().mapToLong(Long::longValue).sum(), 1);
        return crimeTypeCounts.entrySet().stream()
                .map(e -> CrimeTypeBreakdownItem.builder()
                        .type(e.getKey())
                        .count(e.getValue().intValue())
                        .pct((int) Math.round((double) e.getValue() * 100 / total))
                        .build())
                .sorted(Comparator.<CrimeTypeBreakdownItem, Integer>comparing(CrimeTypeBreakdownItem::getCount).reversed())
                .collect(Collectors.toList());
    }

    private List<MonthlyTrendPoint> buildMonthlyTrend(List<FirRecord> records) {
        Map<YearMonth, Long> monthlyCounts = records.stream()
                .collect(Collectors.groupingBy(
                        r -> YearMonth.from(r.getIncidentTs().atZone(ZoneOffset.UTC)),
                        Collectors.counting()));
        List<MonthlyTrendPoint> trend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            trend.add(MonthlyTrendPoint.builder()
                    .month(ym.toString())
                    .cases(monthlyCounts.getOrDefault(ym, 0L).intValue())
                    .build());
        }
        return trend;
    }

    private List<PoliceStationSummary> buildTopPoliceStations(List<FirRecord> records) {
        Map<String, Long> stationCounts = records.stream()
                .collect(Collectors.groupingBy(FirRecord::getStationCode, Collectors.counting()));
        return stationCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    String code = e.getKey();
                    String stationName = unitRepo.findByStationCode(code)
                            .map(u -> u.getStationName())
                            .orElse(code);
                    return PoliceStationSummary.builder()
                            .name(stationName)
                            .cases(e.getValue().intValue())
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<RecentAlert> buildRecentAlerts(List<FirRecord> records) {
        return records.stream()
                .sorted(Comparator.comparing(FirRecord::getIncidentTs).reversed())
                .limit(10)
                .map(r -> {
                    String ts = r.getIncidentTs().toString();
                    return RecentAlert.builder()
                            .crimeNo(r.getFirId())
                            .crimeType(r.getCrimeType())
                            .date(ts.length() >= 10 ? ts.substring(0, 10) : ts)
                            .severity("medium")
                            .build();
                })
                .collect(Collectors.toList());
    }
}
