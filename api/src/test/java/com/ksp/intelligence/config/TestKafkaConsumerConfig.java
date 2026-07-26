package com.ksp.intelligence.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DefaultErrorHandler;
import com.ksp.intelligence.model.FirEventDto;

@Configuration
public class TestKafkaConsumerConfig {

    @Bean(name = "firKafkaListenerContainerFactory")
    public ConcurrentKafkaListenerContainerFactory<String, com.ksp.intelligence.model.FirEventDto> firKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, FirEventDto> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(dummyConsumerFactory());
        factory.setCommonErrorHandler(new DefaultErrorHandler());
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        return factory;
    }

    private ConsumerFactory<String, FirEventDto> dummyConsumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put("bootstrap.servers", "dummy:9092");
        props.put("key.deserializer", StringDeserializer.class);
        props.put("value.deserializer", StringDeserializer.class);
        return new DefaultKafkaConsumerFactory<>(props);
    }
}
