package com.ksp.intelligence;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * KSP Intelligence Portal — Spring Boot entrypoint.
 *
 * Phase 2 scope: three Kafka consumer groups consume {@code fir-events} and:
 *   - Group 1 ({@code indexing-service})   : dual write Postgres + ElasticSearch
 *   - Group 2 ({@code aggregation-service}) : Redis Sorted Set + Hash + Stream
 *   - Group 3 ({@code anomaly-service})    : spike detection, publishes alert-events
 *
 * Phase 3 will add REST controllers; Phase 4 the ML/LNM WebClient calls;
 * Phase 6 security filter chain.
 */
@SpringBootApplication
public class KspIntelligenceApplication {

    public static void main(String[] args) {
        SpringApplication.run(KspIntelligenceApplication.class, args);
    }
}
