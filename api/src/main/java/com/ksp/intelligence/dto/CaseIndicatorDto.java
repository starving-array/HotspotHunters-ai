package com.ksp.intelligence.dto;

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
public class CaseIndicatorDto {
    private String indicatorType;
    private String indicatorValue;
    private String platform;
    private String firstSeen;
    private String lastSeen;
    private boolean isActive;
}
