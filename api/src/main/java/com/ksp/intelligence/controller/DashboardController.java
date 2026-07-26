package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.DashboardKpiDto;
import com.ksp.intelligence.service.DashboardService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping(value = "/api/v1/dashboard/kpis", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<DashboardKpiDto> getKpis() {
        return dashboardService.getKpis();
    }
}
