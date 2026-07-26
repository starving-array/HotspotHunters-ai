# Future Development – Kafka Re‑integration

## Why Kafka is currently disabled
- **Catalyst** does not provide a managed Kafka broker. Deploying a broker inside the same AppSail container would be fragile and would not survive redeploys.
- The production architecture has been switched to **HTTP ingestion** (`EventIngestionController`) and **Redis Streams** for the real‑time feed, which are fully supported by Catalyst.

## When you might need Kafka again

## When you might need Elasticsearch again

- **Full‑text search needs** beyond what PostgreSQL provides (advanced scoring, custom analyzers, multi‑language support, vector similarity, etc.).
- **Existing pipelines** that already publish FIR data to Elasticsearch for analytics dashboards.
- **Requirement for near‑real‑time search** on large volumes where PostgreSQL FTS might become a bottleneck.

### Re‑integration roadmap for Elasticsearch
1. **Provision an external Elasticsearch service** (Elastic Cloud, Amazon OpenSearch, Azure Cognitive Search, or a self‑hosted cluster).
   - Store the endpoint URL in a Catalyst *App Variable* (e.g., `ELASTICSEARCH_URI`).
   - If auth is required, add `ELASTICSEARCH_USERNAME` / `ELASTICSEARCH_PASSWORD`.
2. **Un‑comment the `ElasticSearchConfig` class** in `api/src/main/java/com/ksp/intelligence/config/ElasticSearchConfig.java`.
3. **Enable the Spring Data Elasticsearch starter** by removing the comment markers around its dependency in `api/pom.xml`.
4. **Activate the configuration via a Spring profile** (e.g., `elasticsearch`). Add `spring.profiles.active=elasticsearch` in non‑Catalyst environments.
5. **Update the `IndexingConsumer`** (if you plan to keep dual‑write) to remove the `@ConditionalOnProperty(name = "ksp.kafka.enabled", …)` guard and replace it with `@ConditionalOnProperty(name = "ksp.elasticsearch.enabled", havingValue = "true")`.
6. **Add required test support**:
   - Use `Testcontainers` Elasticsearch (already present but commented) for integration tests.
   - Or keep the existing unit tests and add a dummy `TestElasticsearchConfig` bean that provides a mocked `ElasticsearchOperations`.
7. **CI/CD changes**:
   - Add a separate workflow step that starts an Elasticsearch Testcontainer for integration tests when the `elasticsearch` profile is used.
   - Ensure the Catalyst deployment workflow continues to set the `catalyst` profile, which keeps ES disabled.
8. **Documentation**:
   - Add a section to this `future_development.md` describing environment variables, health‑check config (`management.health.elasticsearch.enabled=true`), and any index‑management scripts.

---
*The rest of the document remains unchanged.*
- High‑throughput event pipelines where ordering, replay, and exactly‑once semantics are required.
- Integration with external systems that already publish FIR events to a Kafka topic.
- Scenarios where you want to decouple producers from the API service with a durable message bus.

## Re‑integration roadmap
1. **Add an external Kafka provider** (Confluent Cloud, AWS MSK, Azure Event Hubs, etc.).
   - Create a Catalyst *App Variable* named `KAFKA_BOOTSTRAP_SERVERS` containing the broker URL.
   - Optionally add `KAFKA_SASL_USERNAME` / `KAFKA_SASL_PASSWORD` for SASL/SSL auth.
2. **Enable the Kafka beans**
   - Un‑comment the contents of `api/src/main/java/com/ksp/intelligence/config/KafkaConsumerConfig.java`.
   - Add `@Profile("!catalyst")` (or keep existing conditional) so the bean is only active when the `catalyst` profile is **not** set.
3. **Switch Spring profiles**
   - In `application.yml`/`application-catalyst.yml` set `spring.profiles.active=catalyst` for Catalyst builds.
   - For local / non‑Catalyst environments use the default profile (Kafka enabled).
4. **Add a test‑only configuration** (already present) that provides a dummy `firKafkaListenerContainerFactory` bean so unit tests start without a real broker.
   - No code changes required – the `TestKafkaConsumerConfig` class under `src/test/java/com/ksp/intelligence/config/` is automatically loaded.
5. **Update CI/CD**
   - Ensure the `deploy.yml` workflow does **not** set the `catalyst` profile when you want a Kafka‑enabled build (e.g., a separate staging workflow).
   - If you need to run integration tests against a real broker, spin up a Docker‑Compose Kafka service in the CI job before `mvn verify`.
6. **Documentation & monitoring**
   - Add a README entry describing required environment variables.
   - Enable Spring Boot Actuator health check for Kafka (`management.health.kafka.enabled=true`).

## Checklist for re‑enabling Kafka
- [ ] Provision external Kafka cluster and obtain connection details.
- [ ] Add Catalyst app variables for the broker URL and credentials.
- [ ] Un‑comment `KafkaConsumerConfig` and verify it compiles.
- [ ] Run the full Maven test suite (`mvn verify`) to ensure the dummy test config still works.
- [ ] Deploy to a non‑Catalyst environment and verify end‑to‑end event flow.

---
*This file serves as a quick reference for anyone needing to bring Kafka back into the project without hunting through commit history.*
