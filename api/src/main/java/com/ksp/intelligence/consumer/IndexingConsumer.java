// Elasticsearch based indexing consumer removed; see docs/future_development.md for re‑integration plan

package com.ksp.intelligence.consumer;

/**
 * Placeholder class kept only so the source tree compiles when the Elasticsearch
 * dependency is omitted. All real indexing logic is disabled for Catalyst
 * deployments. When you decide to bring Elasticsearch back, replace this file
 * with the original implementation from the repository history.
 */
public class IndexingConsumer {
    // No‑op – functionality removed for Catalyst.
}


    @KafkaListener(
            topics = "${ksp.kafka.fir-topic:fir-events}",
            groupId = "${ksp.kafka.consumer-groups.indexing:indexing-service}",
            containerFactory = "firKafkaListenerContainerFactory"
    )
    public void onFirEvent(ConsumerRecord<String, FirEventDto> record, Acknowledgment ack) {
        FirEventDto dto = record.value();
        log.debug("Received FIR DTO with firId: {}", dto != null ? dto.getFirId() : "null");
        try {
            FirRecord entity = FirRecord.from(dto);
            Map<String, Object> doc = toEsDoc(dto);
            IndexQuery iq = new IndexQueryBuilder()
                    .withId(dto.getFirId())
                    .withObject(doc)
                    .build();

            // Parallel PG + ES writes via virtual threads
            CompletableFuture<Void> pgFuture = CompletableFuture.runAsync(() ->
                    firRepo.save(entity), IO_EXECUTOR);
            CompletableFuture<Void> esFuture = CompletableFuture.runAsync(() ->
                    es.index(iq, IndexCoordinates.of(crimeIndex)), IO_EXECUTOR);

            CompletableFuture.allOf(pgFuture, esFuture).join();

            log.debug("Indexed FIR {} (district={}, crime_type={})",
                    dto.getFirId(), dto.getDistrictCode(), dto.getCrimeType());

            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to index FIR {}: {} | offset will NOT be committed",
                    dto.getFirId(), e.getMessage(), e);
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
