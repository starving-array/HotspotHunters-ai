package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.CaseDetailDto;
import com.ksp.intelligence.service.CaseDetailService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CaseDetailController {

    private final CaseDetailService caseDetailService;

    public CaseDetailController(CaseDetailService caseDetailService) {
        this.caseDetailService = caseDetailService;
    }

    @GetMapping(value = "/api/v1/cases/{caseMasterId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CaseDetailDto> getCaseDetail(@PathVariable int caseMasterId) {
        return caseDetailService.getCaseDetail(caseMasterId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
