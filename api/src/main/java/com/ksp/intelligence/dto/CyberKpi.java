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
public class CyberKpi {
    private long itActCases;
    private long financialFraud;
    private long identityTheft;
}
