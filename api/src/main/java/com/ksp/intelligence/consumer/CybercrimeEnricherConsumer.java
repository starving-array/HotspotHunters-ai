package com.ksp.intelligence.consumer;

import com.ksp.intelligence.model.FirEventDto;
import com.ksp.intelligence.model.domain.IndicatorType;
import com.ksp.intelligence.service.OsintEnrichmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
public class CybercrimeEnricherConsumer {

    private static final Logger log = LoggerFactory.getLogger(CybercrimeEnricherConsumer.class);

    private final OsintEnrichmentService osintService;

    public CybercrimeEnricherConsumer(OsintEnrichmentService osintService) {
        this.osintService = osintService;
    }

    @KafkaListener(
            topics = "${ksp.kafka.topics.fir-events:fir-events}",
            groupId = "${ksp.kafka.consumer-groups.enricher:enricher-service}",
            containerFactory = "firKafkaListenerContainerFactory"
    )
    public void onFirEvent(FirEventDto dto, Acknowledgment ack) {
        try {
            if (dto == null) {
                ack.acknowledge();
                return;
            }

            String mo = dto.getModusOperandi();
            if (mo == null || mo.isBlank()) {
                log.debug("Enricher: FIR {} has no modus operandi to scan", dto.getFirId());
                ack.acknowledge();
                return;
            }

            // Extract indicators from modus operandi text
            Map<IndicatorType, Set<String>> indicators = osintService.extractIndicators(mo);
            if (indicators.isEmpty()) {
                log.debug("Enricher: no indicators found in FIR {} modus operandi", dto.getFirId());
                ack.acknowledge();
                return;
            }

            // Enrich each indicator
            int totalIndicators = 0;
            int maliciousCount = 0;
            for (var entry : indicators.entrySet()) {
                String type = entry.getKey().dbValue();
                for (String value : entry.getValue()) {
                    totalIndicators++;
                    var result = osintService.lookupIndicator(value, type);
                    if (result != null && result.isMalicious()) {
                        maliciousCount++;
                        log.warn("Enricher: malicious indicator {}={} in FIR {} (confidence={})",
                                type, value, dto.getFirId(), result.getConfidence());
                    }
                }
            }

            if (maliciousCount > 0) {
                log.info("Enricher: FIR {} has {}/{} malicious indicators — flagged for review",
                        dto.getFirId(), maliciousCount, totalIndicators);
            } else {
                log.debug("Enricher: FIR {} indicators clean ({})", dto.getFirId(), totalIndicators);
            }

            ack.acknowledge();
        } catch (Exception e) {
            log.error("Enricher failed for FIR {}: {}", dto != null ? dto.getFirId() : "null", e.getMessage());
            ack.acknowledge();
        }
    }
}
