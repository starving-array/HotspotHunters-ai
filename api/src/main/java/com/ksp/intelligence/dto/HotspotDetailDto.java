package com.ksp.intelligence.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotspotDetailDto {
    private String name;
    private Integer totalCases;
    private Double trendPct;
    private List<CrimeTypeBreakdownItem> crimeTypeBreakdown;
    private List<MonthlyTrendPoint> monthlyTrend;
    private List<PoliceStationSummary> topPoliceStations;
    private List<RecentAlert> recentAlerts;
}
