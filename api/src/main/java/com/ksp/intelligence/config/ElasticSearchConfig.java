package com.ksp.intelligence.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.client.ClientConfiguration;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;

/**
 * ElasticSearch 8.x client configuration.
 *
 * Spring Boot's {@code spring.elasticsearch.uris} property exposes connection info,
 * but creating a custom configuration here lets us pin timeouts explicitly and
 * (in Phase 6) layer basic auth/SSL on top.
 */
@Configuration
public class ElasticSearchConfig extends ElasticsearchConfiguration {

    @Value("${spring.elasticsearch.uris:http://elasticsearch:9200}")
    private String elasticUri;

    @Override
    public ClientConfiguration clientConfiguration() {
        return ClientConfiguration.builder()
                .connectedTo(stripScheme(elasticUri))
                .withConnectTimeout(java.time.Duration.ofSeconds(10))
                .withSocketTimeout(java.time.Duration.ofSeconds(60))
                .build();
    }

    /**
     * Convert either {@code http://elasticsearch:9200} or {@code https://...}
     * to the {@code host:port} form that {@link ClientConfiguration#connectedTo} expects.
     */
    private String stripScheme(String uri) {
        return uri.replaceFirst("^https?://", "");
    }
}
