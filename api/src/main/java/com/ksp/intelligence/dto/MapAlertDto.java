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
public class MapAlertDto {
    private String id;
    private Integer caseMasterId;
    private String crimeNo;
    private String crimeType;
    private String district;
    private Double latitude;
    private Double longitude;
    private String severity;
    private String timestamp;
}
