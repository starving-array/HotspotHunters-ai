package com.ksp.intelligence.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirSearchResultDto {
    private int caseMasterId;
    private String crimeNo;
    private String crimeType;
    private String district;
    private String policeStation;
    private String registeredDate;
    private String briefFacts;
    private String severity;
}
