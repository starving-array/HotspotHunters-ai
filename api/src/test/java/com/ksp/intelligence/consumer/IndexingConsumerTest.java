package com.ksp.intelligence.consumer;

import com.ksp.intelligence.model.FirEventDto;
import com.ksp.intelligence.model.FirRecord;
import com.ksp.intelligence.repository.FirRecordRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.ArgumentCaptor;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.data.elasticsearch.core.query.IndexQuery;
import org.springframework.kafka.support.Acknowledgment;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link IndexingConsumer} — Group 1 dual-write PostgreSQL + ElasticSearch.
 *
 * Uses Mockito to verify:
 *     - FirRecordRepository.save() called with the correct entity built from DTO
 *     - ElasticsearchOperations.index() called with correct _id (fir_id) and content
 *     - ack.acknowledge() called after both writes succeed
 *     - On exception: ack NOT called, exception re-thrown (offset stays uncommitted)
 */
@ExtendWith(MockitoExtension.class)
class IndexingConsumerTest {

    @Mock private FirRecordRepository firRepo;
    @Mock private ElasticsearchOperations es;
    @Mock private Acknowledgment ack;

    @InjectMocks private IndexingConsumer consumer;

    private FirEventDto sampleDto;

    @BeforeEach
    void setUp() {
        sampleDto = FirEventDto.builder()
                .firId("FIR_TEST_001")
                .stationCode("STBLRURB001")
                .districtCode("BLR_URB")
                .talukCode("BLR_URB_001")
                .crimeType("robbery")
                .crimeSubtype("armed_robbery")
                .latitude(12.9716)
                .longitude(77.5946)
                .incidentTs(Instant.parse("2026-07-16T10:00:00Z"))
                .registeredTs(Instant.parse("2026-07-16T10:00:30Z"))
                .offenderId("OFF_001")
                .victimId("VIC_001")
                .modusOperandi("weapon_threat, night_target")
                .status("OPEN")
                .build();
    }

    @Test
    @DisplayName("happy path: PG save + ES index + ack called")
    void onFirEvent_happy_path_saves_and_acks() {
        when(firRepo.save(any(FirRecord.class))).thenAnswer(inv -> inv.getArgument(0));
        when(es.index(any(IndexQuery.class), any(IndexCoordinates.class)))
                .thenReturn("elastic-doc-id");

        consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                sampleDto.getDistrictCode(), sampleDto), ack);

        // Verify Postgres save called once with entity built from DTO
        ArgumentCaptor<FirRecord> pgCaptor = ArgumentCaptor.forClass(FirRecord.class);
        verify(firRepo).save(pgCaptor.capture());
        FirRecord saved = pgCaptor.getValue();
        assertThat(saved.getFirId()).isEqualTo("FIR_TEST_001");
        assertThat(saved.getDistrictCode()).isEqualTo("BLR_URB");
        assertThat(saved.getCrimeType()).isEqualTo("robbery");
        assertThat(saved.getLatitude()).isEqualTo(12.9716);
        assertThat(saved.getIncidentTs()).isEqualTo(Instant.parse("2026-07-16T10:00:00Z"));

        // Verify ES index called once with the right _id (fir_id — idempotency requirement)
        ArgumentCaptor<IndexQuery> esCaptor = ArgumentCaptor.forClass(IndexQuery.class);
        verify(es).index(esCaptor.capture(), any(IndexCoordinates.class));
        assertThat(esCaptor.getValue().getId()).isEqualTo("FIR_TEST_001");

        // Verify ack called (offset committed)
        verify(ack).acknowledge();
    }

    @Test
    @DisplayName("on PG save failure: ack NOT called and exception propagated")
    void onFirEvent_pg_failure_noAck_and_throw() {
        when(firRepo.save(any(FirRecord.class)))
                .thenThrow(new RuntimeException("DB constraint violation"));

        try {
            consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                    sampleDto.getDistrictCode(), sampleDto), ack);
            org.junit.jupiter.api.Assertions.fail("expected RuntimeException");
        } catch (RuntimeException e) {
            assertThat(e.getMessage()).contains("Indexing failure");
        }

        // Verify ack NOT called (offset must stay uncommitted for replay)
        verify(ack, never()).acknowledge();
        // ES should NOT have been called since PG failed first
        verify(es, never()).index(any(IndexQuery.class), any(IndexCoordinates.class));
    }

    @Test
    @DisplayName("on ES failure: ack NOT called and exception propagated")
    void onFirEvent_es_failure_noAck_and_throw() {
        when(firRepo.save(any(FirRecord.class))).thenAnswer(inv -> inv.getArgument(0));
        when(es.index(any(IndexQuery.class), any(IndexCoordinates.class)))
                .thenThrow(new RuntimeException("ES cluster red"));

        try {
            consumer.onFirEvent(new ConsumerRecord<>("fir-events", 0, 0L,
                    sampleDto.getDistrictCode(), sampleDto), ack);
            org.junit.jupiter.api.Assertions.fail("expected RuntimeException");
        } catch (RuntimeException e) {
            assertThat(e.getMessage()).contains("Indexing failure");
        }

        // Verify PG was saved (writes are not rolled back — consumer will get redelivery)
        verify(firRepo).save(any(FirRecord.class));
        // Verify ack NOT called
        verify(ack, never()).acknowledge();
    }
}
