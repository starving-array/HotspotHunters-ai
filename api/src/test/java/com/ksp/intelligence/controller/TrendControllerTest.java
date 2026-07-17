package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.FirRecord;
import com.ksp.intelligence.repository.FirRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import java.time.Instant;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TrendControllerTest {

    @Mock
    private FirRecordRepository repo;

    private TrendController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new TrendController(repo);
    }

    @Test
    void getTrend_returns12MonthsByDefault() {
        when(repo.findByDistrictCodeAndIncidentTsBetween(anyString(), any(), any()))
                .thenReturn(List.of());
        var result = controller.getTrend("D01", 12);
        assertEquals(12, result.size());
    }
}
