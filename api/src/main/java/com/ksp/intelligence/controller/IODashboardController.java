package com.ksp.intelligence.controller;

import com.ksp.intelligence.dto.IODashboardDataDto;
import com.ksp.intelligence.service.IODashboardService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IODashboardController {

    private final IODashboardService ioDashboardService;

    public IODashboardController(IODashboardService ioDashboardService) {
        this.ioDashboardService = ioDashboardService;
    }

    @GetMapping(value = "/api/v1/io/dashboard", produces = MediaType.APPLICATION_JSON_VALUE)
    public IODashboardDataDto getIODashboard() {
        return ioDashboardService.getIODashboard();
    }
}
