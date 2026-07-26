package com.ksp.intelligence.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies.LowerCamelCaseStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
@JsonNaming(LowerCamelCaseStrategy.class)
public class OsintResultDto {
    private final String indicatorType;
    private final String indicatorValue;
    private final boolean malicious;
    private final String confidence;
    private final int reports;
    private final List<String> categories;
    private final List<String> tags;
    private final int reputation;
    private final String source;
    private final String country;
    private final String asn;
    private final Instant enrichedAt;
    private final String error;
}
