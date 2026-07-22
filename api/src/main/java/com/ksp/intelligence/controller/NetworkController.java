package com.ksp.intelligence.controller;

import com.ksp.intelligence.repository.OffenderRepository;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class NetworkController {

    private final OffenderRepository offenderRepo;

    public NetworkController(OffenderRepository offenderRepo) {
        this.offenderRepo = offenderRepo;
    }

    @GetMapping(value = "/api/v1/network/{accusedId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getCoAccused(@PathVariable String accusedId) {
        return offenderRepo.findCoOffenders(accusedId);
    }
}
