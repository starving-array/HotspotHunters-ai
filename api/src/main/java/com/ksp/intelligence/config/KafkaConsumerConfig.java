package com.ksp.intelligence.config;

import com.ksp.intelligence.model.FirEventDto;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Kafka consumer factories for the three Phase 2 consumer groups.
 *
 * Each group is configured with manual ack (ack-mode manual_immediate) so that
 * only successfully-processed messages commit their offsets — giving idempotent
 * behavior under replay (each consumer tolerates the same event arriving twice).
 *
 * Groups:
 *   - indexing-service    : dual-write Postgres + ElasticSearch
 *   - aggregation-service : Redis Sorted Set / Hash / Stream
 *   - anomaly-service     : spike detection -> publish alert-events
 */
@EnableKafka
@Configuration
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.listener.auto-startup:true}")
    private boolean autoStartup;

    // ----- Shared base factory config -----
    private Map<String, Object> baseProps() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        // ErrorHandlingDeserializer delegates — bad messages log + skip, never hang the consumer.
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);

        props.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class);

        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.ksp.intelligence.*");
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, FirEventDto.class.getName());
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);

        return props;
    }

    // ----- Generic factory (used by @KafkaListener with explicit groupId) -----
    @Bean(name = "firKafkaListenerContainerFactory")
    public ConcurrentKafkaListenerContainerFactory<String, FirEventDto> firKafkaListenerContainerFactory(
            ConsumerFactory<String, FirEventDto> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, FirEventDto> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(3);
        factory.setAutoStartup(autoStartup);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        return factory;
    }

    @Bean
    public ConsumerFactory<String, FirEventDto> consumerFactory() {
        return new DefaultKafkaConsumerFactory<>(baseProps());
    }
}
