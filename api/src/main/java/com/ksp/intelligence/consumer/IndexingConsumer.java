package com.ksp.intelligence.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ksp.intelligence.model.FirEventDto;
import com.ksp.intelligence.model.FirRecord;
import com.ksp.intelligence.repository.FirRecordRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.document.Document;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.data.elasticsearch.core.query.IndexQuery;
import org.springframework.data.elasticsearch.core.query.IndexQueryBuilder;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Consumer Group 1 — "indexing-service"
 *
 * Dual write each FIR event to:
 *   - PostgreSQL (Spring Data JPA upsert — idempotent on fir_id PRIMARY KEY)
 *   - ElasticSearch (index operation with _id = fir_id — idempotent on _id)
 *
 * Manual ack only AFTER both writes succeed → on failure, offset stays uncommitted
 * and the consumer re-delivers the event. Both writes are idempotent so a retry
 * after partial failure is safe.
 *
 * ElasticSearch document shape is designed to match the mapping declared in
 * infra/elasticsearch/mappings.json (Phase 0):
 *   - location is a geo_point {lat, lon}
 *   - district/taluk/crime_type are keywords
 *   - incident_ts is a date
 *   - modus_operandi is analyzed text (english analyzer)
 */
@Component
public class IndexingConsumer {

    private static final Logger log = LoggerFactory.getLogger(IndexingConsumer.class);

    private final FirRecordRepository firRepo;
    private final ElasticsearchOperations es;
    private final ObjectMapper objectMapper;

    @Value("${ksp.elasticsearch.crime-index:crime-index}")
    private String crimeIndex;

    @Value("${ksp.kafka.consumer-groups.indexing:indexing-service}")
    private String groupId;

    public IndexingConsumer(FirRecordRepository firRepo,
                            ElasticsearchOperations es,
                            ObjectMapper objectMapper) {
        this.firRepo = firRepo;
        this.es = es;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${ksp.kafka.fir-topic:fir-events}",
            groupId = "${ksp.kafka.consumer-groups.indexing:indexing-service}",
            containerFactory = "firKafkaListenerContainerFactory"
    )
    public void onFirEvent(ConsumerRecord<String, FirEventDto> record, Acknowledgment ack) {
        FirEventDto dto = record.value();
        try {
            FirRecord entity = FirRecord.from(dto);
            // 1. Postgres upsert (idempotent on PK)
            firRepo.save(entity);

            // 2. ElasticSearch index (_id = fir_id, idempotent on _id)
            Map<String, Object> doc = toEsDoc(dto);
            IndexQuery iq = new IndexQueryBuilder()
                    .withId(dto.getFirId())
                    .withObject(doc)
                    .build();
            es.index(iq, IndexCoordinates.of(crimeIndex));

            log.debug("Indexed FIR {} (district={}, crime_type={})",
                    dto.getFirId(), dto.getDistrictCode(), dto.getCrimeType());

            // 3. Commit offset only after both writes succeed
            ack.acknowledge();
        } catch (Exception e) {
            // Don't ack — Spring Kafka will retry the same event.
            log.error("Failed to index FIR {}: {} | offset will NOT be committed",
                    dto.getFirId(), e.getMessage(), e);
            // Re-throw so the default error handler policies kicks in (retry + DLT later)
            throw new RuntimeException("Indexing failure for fir_id=" + dto.getFirId(), e);
        }
    }

    /**
     * Build the ElasticSearch document body matching the Phase 0 mapping (mappings.json).
     * Key fields:
     *   - location : geo_point {lat, lon}
     *   - incident_ts : ISO date
     *   - modus_operandi : english-analyzed text
     */
    private Map<String, Object> toEsDoc(FirEventDto dto) {
        Map<String, Object> doc = new HashMap<>();
        doc.put("fir_id", dto.getFirId());
        doc.put("district", dto.getDistrictCode());
        doc.put("taluk", dto.getTalukCode());
        doc.put("station_code", dto.getStationCode());
        doc.put("crime_type", dto.getCrimeType());
        doc.put("crime_subtype", dto.getCrimeSubtype());

        // geo_point expected as {lat, lon} object
        Map<String, Double> loc = new HashMap<>();
        loc.put("lat", dto.getLatitude());
        loc.put("lon", dto.getLongitude());
        doc.put("location", loc);

        doc.put("incident_ts", dto.getIncidentTs() != null ? dto.getIncidentTs().toString() : null);
        doc.put("registered_ts", dto.getRegisteredTs() != null ? dto.getRegisteredTs().toString() : null);
        doc.put("offender_id", dto.getOffenderId());
        doc.put("victim_id", dto.getVictimId());
        doc.put("modus_operandi", dto.getModusOperandi());
        doc.put("status", dto.getStatus() != null ? dto.getStatus() : "OPEN");
        return doc;
    }

    // ----- Visible for tests (test-only accessor) -----
    String crimeIndex() { return crimeIndex; }
    String groupId() { return groupId; }
}
