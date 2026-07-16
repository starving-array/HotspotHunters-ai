package com.ksp.intelligence.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * PostgreSQL / JPA repository configuration.
 *
 * Spring Boot's {@code spring.datasource.*} and {@code spring.jpa.*} properties
 * (see {@code application.yml}) fully configure the DataSource and Hibernate
 * via auto-configuration. This class provides a single explicit hook to:
 *   - scope JPA repository scanning to the application's package
 *   - (in Phase 6) layer fine-grained read-only / read-write EM customisations
 *     for the {@code ksp_readonly} role declared in {@code infra/postgres/init.sql}
 *
 * Keeping this explicit config matches the architecture doc §9.1 / §11 Phase 2
 * checklist while staying out of Spring Boot's way.
 */
@Configuration
@EnableJpaRepositories(basePackages = "com.ksp.intelligence.repository")
public class PostgresConfig {
}
