package com.ksp.intelligence;


import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.boot.test.mock.mockito.MockBean;
import org.junit.jupiter.api.BeforeEach;
import static org.mockito.Mockito.*;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StreamOperations;


import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.TestPropertySource;

/**
 * Spring Boot context-load test.
 *
 * Mocks KafkaTemplate and ElasticsearchOperations so no live infra is needed.
 * Excludes:
 *   - ElasticSearchConfig — prevents attempts to reach a live ES cluster.
 *   - KafkaConsumerConfig  — prevents @EnableKafka from registering listeners that
 *     instantiate real Kafka consumers against the (intentionally invalid) bootstrap
 *     server during context refresh. Even with spring.kafka.listener.auto-startup=false,
 *     the ConcurrentKafkaListenerContainerFactory creates consumers eagerly.
 * Uses H2 as a lightweight datasource instead of real PostgreSQL.
 */
@SpringBootTest

@TestPropertySource(properties = {
        "spring.kafka.consumer.auto-offset-reset=earliest",
        "spring.kafka.listener.auto-startup=false",
        "spring.datasource.url=jdbc:h2:mem:ksp_test;Mode=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "management.health.elasticsearch.enabled=false",
        "management.health.redis.enabled=false",
        "spring.kafka.bootstrap-servers=invalid:9999"
})
class KspIntelligenceApplicationTest {

    @MockBean
    KafkaTemplate<String, Object> kafkaTemplate;

    @MockBean
    org.springframework.data.elasticsearch.core.ElasticsearchOperations elasticsearchOperations;

    @MockBean(name = "stringRedisTemplate")
    org.springframework.data.redis.core.StringRedisTemplate stringRedisTemplate;

    @BeforeEach
    void setUp() {
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);

        ZSetOperations<String, String> zSetOps = mock(ZSetOperations.class);
        when(stringRedisTemplate.opsForZSet()).thenReturn(zSetOps);

        HashOperations<String, Object, Object> hashOps = mock(HashOperations.class);
        when(stringRedisTemplate.opsForHash()).thenReturn(hashOps);

        StreamOperations<String, Object, Object> streamOps = mock(StreamOperations.class);
        when(stringRedisTemplate.opsForStream()).thenReturn(streamOps);
    }

    @Test
    void contextLoads() {
        // Spring context starts with the configuration beans defined in Phase 2.
    }
}
