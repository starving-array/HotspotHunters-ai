package com.ksp.intelligence.config;

// CATALYST: ElasticSearch config disabled (replaced by PG full-text search).
// Uncomment for local Docker deployment with ElasticSearch.
/*
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.client.ClientConfiguration;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;

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

    private String stripScheme(String uri) {
        return uri.replaceFirst("^https?://", "");
    }
}
*/

