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
public class RelatedCaseDto {
    private int caseMasterId;
    private String crimeNo;
    private String crimeMajorHead;
    private String districtName;
    private String status;
}
