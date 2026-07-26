package com.ksp.intelligence.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseDetailDto {
    private int caseMasterId;
    private String crimeNo;
    private String caseNo;
    private String crimeRegisteredDate;
    private String caseCategory;
    private String gravityOffence;
    private String crimeMajorHead;
    private String crimeMinorHead;
    private String caseStatusName;
    private String courtName;
    private String districtName;
    private String policeStationName;
    private String policePersonName;
    private String incidentFromDate;
    private String incidentToDate;
    private String infoReceivedPSDate;
    private double latitude;
    private double longitude;
    private String briefFacts;
    private String complainantName;
    private String suspectName;
    private String victimName;
    private boolean isCybercrime;
    private String primaryPlatform;
    private double financialLoss;
    private String cyberSeverity;
    private List<CaseIndicatorDto> indicators;
    private String chargesheetDate;
    private String chargesheetType;
    private List<TimelineEventDto> timeline;
    private List<RelatedCaseDto> relatedCases;
    private String lastUpdated;
}
