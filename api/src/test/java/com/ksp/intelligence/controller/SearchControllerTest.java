package com.ksp.intelligence.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.SearchHit;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SearchControllerTest {

    @Mock
    private ElasticsearchOperations esOps;

    private SearchController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new SearchController(esOps);
    }

    @Test
    void search_withoutGeo_returnsResults() {
        // Mock a simple hit
        SearchHit<Map<String, Object>> hit = mock(SearchHit.class);
        when(hit.getContent()).thenReturn(Map.of("id", "1"));
        SearchHits<Map<String, Object>> hits = mock(SearchHits.class);
        when(hits.getSearchHits()).thenReturn(List.of(hit));
        when(esOps.search(any(), eq(Map.class))).thenReturn(hits);
        var result = controller.search("test", null, null, 5.0);
        assertEquals(1, result.size());
    }

    @Test
    void search_geoMissingLatOrLon_throws() {
        assertThrows(IllegalArgumentException.class, () -> controller.search("test", 10.0, null, 5.0));
        assertThrows(IllegalArgumentException.class, () -> controller.search("test", null, 20.0, 5.0));
    }
}
