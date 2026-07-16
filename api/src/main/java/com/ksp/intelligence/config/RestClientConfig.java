package com.ksp.intelligence.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.util.concurrent.TimeUnit;

/**
 * Reactive {@link WebClient} configuration used for outbound calls from the
 * Spring Boot API to other services:
 *   - Phase 4: Python FastAPI ML/LLM service ({@code /predict}, {@code /nl/translate})
 *   - Phase 6: optional LLM API fallbacks
 *
 * Timeouts (overridable via env so prod can tune):
 *   - connect:    {@code ksp.http.connect-timeout-ms} (default 2000ms — fail fast)
 *   - read/write: ${@code ksp.http.io-timeout-ms}       (default 3000ms for ML, longer for LLM later)
 *
 * A named bean ({@code mlServiceWebClient}) reads {@code ML_SERVICE_URL} per
 * architecture doc §15 / {@code .env.example}; a generic builder is also
 * available for ad-hoc reuse in later phases.
 */
@Configuration
public class RestClientConfig {

    @Value("${ksp.http.connect-timeout-ms:2000}")
    private int connectTimeoutMs;

    @Value("${ksp.http.io-timeout-ms:3000}")
    private int ioTimeoutMs;

    @Value("${ML_SERVICE_URL:http://python-ml:8001}")
    private String mlServiceBaseUrl;

    /**
     * Tuned {@link HttpClient} with explicit connect/read/write timeouts so that
     * an unresponsive downstream (e.g. LLM service cold start) cannot pin a
     * request thread. Reactive — does not block the Kafka consumer threads.
     */
    @Bean
    public HttpClient httpClient() {
        return HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
                .doOnConnected(c -> c
                        .addHandlerLast(new ReadTimeoutHandler(ioTimeoutMs, TimeUnit.MILLISECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(ioTimeoutMs, TimeUnit.MILLISECONDS)));
    }

    /**
     * Generic WebClient used for one-off outbound calls where the base URL is
     * supplied at the call site.
     */
    @Bean(name = "defaultWebClient")
    public WebClient defaultWebClient(HttpClient httpClient) {
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    /**
     * Pre-configured WebClient for the Python ML/LLM FastAPI service.
     * Spring Boot controllers (added in Phase 4) inject this bean and call
     * e.g. {@code mlServiceWebClient.post().uri("/predict/hotspot")...}.
     */
    @Bean(name = "mlServiceWebClient")
    public WebClient mlServiceWebClient(HttpClient httpClient) {
        return WebClient.builder()
                .baseUrl(mlServiceBaseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }
}
