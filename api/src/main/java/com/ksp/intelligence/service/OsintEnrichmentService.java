package com.ksp.intelligence.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ksp.intelligence.dto.OsintResultDto;
import com.ksp.intelligence.model.domain.IndicatorType;
import com.ksp.intelligence.repository.CyberIndicatorRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class OsintEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(OsintEnrichmentService.class);

    private static final String REDIS_CACHE_PREFIX = "osint:cache:";
    private static final Duration CACHE_TTL = Duration.ofDays(7);

    private static final Pattern IP_PATTERN =
            Pattern.compile("\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b");
    private static final Pattern DOMAIN_PATTERN =
            Pattern.compile("\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}\\b");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("\\b(?:\\+91|0)?[6-9]\\d{9}\\b");
    private static final Pattern WALLET_PATTERN =
            Pattern.compile("\\b0x[a-fA-F0-9]{40}\\b|\\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\\b");
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b");

    private static final List<String> MALICIOUS_CATEGORIES = List.of("phishing", "scanner", "malware", "botnet", "spam", "c2", "ransomware", "fraud");
    private static final List<String> BENIGN_CATEGORIES = List.of("cdn", "hosting", "isp", "education", "government", "social");
    private static final List<String> COUNTRIES = List.of("IN", "CN", "RU", "US", "SG", "NL", "DE", "BR", "NG", "HK");
    private static final List<String> ASNS = List.of("AS9829", "AS4134", "AS4837", "AS15169", "AS16509", "AS8075", "AS24940");

    private final CyberIndicatorRepository indicatorRepo;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ksp.osint.mock-malicious-ratio:0.3}")
    private double mockMaliciousRatio;

    public OsintEnrichmentService(CyberIndicatorRepository indicatorRepo,
                                  StringRedisTemplate redisTemplate,
                                  ObjectMapper objectMapper) {
        this.indicatorRepo = indicatorRepo;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        log.info("OSINT Enrichment Service initialized (mock provider, malicious ratio={})", mockMaliciousRatio);
        prewarmCache();
    }

    private void prewarmCache() {
        log.info("Pre-warming OSINT enrichment cache from cyber_indicators...");
        List<Object[]> distinctIocs = indicatorRepo.findDistinctIndicatorTypeAndValue();
        int cached = 0;
        for (Object[] row : distinctIocs) {
            String type = (String) row[0];
            String value = (String) row[1];
            String cacheKey = REDIS_CACHE_PREFIX + type + ":" + value;
            if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) continue;
            OsintResultDto result = mockEnrich(value, type);
            try {
                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), CACHE_TTL);
                cached++;
            } catch (Exception e) {
                log.warn("Failed to cache OSINT result for {}={}: {}", type, value, e.getMessage());
            }
        }
        log.info("Pre-warmed {} OSINT enrichment entries in Redis cache", cached);
    }

    @Cacheable(value = "osint", keyGenerator = "osintCacheKeyGenerator")
    public OsintResultDto lookupIndicator(String indicatorValue, String indicatorType) {
        return mockEnrich(indicatorValue, indicatorType);
    }

    public Map<String, List<OsintResultDto>> enrichBrieffacts(String brieffacts) {
        if (brieffacts == null || brieffacts.isBlank()) {
            return Map.of();
        }
        Map<IndicatorType, Set<String>> extracted = extractIndicators(brieffacts);
        Map<String, List<OsintResultDto>> results = new LinkedHashMap<>();
        for (Map.Entry<IndicatorType, Set<String>> entry : extracted.entrySet()) {
            String type = entry.getKey().dbValue();
            List<OsintResultDto> enriched = entry.getValue().stream()
                    .map(value -> lookupIndicator(value, type))
                    .toList();
            results.put(type, enriched);
        }
        return results;
    }

    public Map<IndicatorType, Set<String>> extractIndicators(String text) {
        Map<IndicatorType, Set<String>> results = new LinkedHashMap<>();
        results.put(IndicatorType.IP, extractMatches(text, IP_PATTERN));
        results.put(IndicatorType.DOMAIN, extractMatches(text, DOMAIN_PATTERN).stream()
                .filter(d -> !d.endsWith(".local") && !d.endsWith(".internal"))
                .filter(d -> d.chars().filter(c -> c == '.').count() >= 1)
                .collect(Collectors.toSet()));
        results.put(IndicatorType.PHONE, extractMatches(text, PHONE_PATTERN));
        results.put(IndicatorType.WALLET, extractMatches(text, WALLET_PATTERN));
        results.put(IndicatorType.EMAIL, extractMatches(text, EMAIL_PATTERN));
        results.values().removeIf(Set::isEmpty);
        return results;
    }

    private OsintResultDto mockEnrich(String value, String type) {
        long hash = hash(value);
        boolean malicious = (hash % 100) < (mockMaliciousRatio * 100);
        ThreadLocalRandom rng = ThreadLocalRandom.current();
        int reportCount = malicious ? rng.nextInt(3, 50) : rng.nextInt(0, 3);
        int reputation = malicious ? rng.nextInt(0, 30) : rng.nextInt(60, 100);

        List<String> categories = new ArrayList<>();
        if (malicious) {
            int catCount = rng.nextInt(1, 4);
            for (int i = 0; i < catCount; i++) {
                categories.add(MALICIOUS_CATEGORIES.get(rng.nextInt(MALICIOUS_CATEGORIES.size())));
            }
        } else if (rng.nextDouble() < 0.3) {
            categories.add(BENIGN_CATEGORIES.get(rng.nextInt(BENIGN_CATEGORIES.size())));
        }

        List<String> tags = new ArrayList<>();
        if (malicious) {
            tags.add("known_threat");
            if (reportCount > 20) tags.add("high_confidence");
            if (type.equals("domain")) tags.add("phishing_domain");
            if (type.equals("ip")) tags.add("vpn_exit_node");
        } else {
            if (hash % 5 == 0) tags.add("previously_flagged");
            else tags.add("clean");
        }

        return OsintResultDto.builder()
                .indicatorType(type)
                .indicatorValue(value)
                .malicious(malicious)
                .confidence(malicious ? (reportCount > 20 ? "high" : "medium") : "low")
                .reports(reportCount)
                .categories(categories.stream().distinct().toList())
                .tags(tags)
                .reputation(reputation)
                .source("mock")
                .country(malicious ? COUNTRIES.get(rng.nextInt(COUNTRIES.size())) : "IN")
                .asn(malicious ? ASNS.get(rng.nextInt(ASNS.size())) : null)
                .enrichedAt(Instant.now())
                .error(null)
                .build();
    }

    private Set<String> extractMatches(String text, Pattern pattern) {
        Set<String> matches = new LinkedHashSet<>();
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            matches.add(matcher.group().toLowerCase());
        }
        return matches;
    }

    private long hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = md.digest(input.getBytes(StandardCharsets.UTF_8));
            long h = 0;
            for (int i = 0; i < 8; i++) {
                h = (h << 8) | (hashBytes[i] & 0xFF);
            }
            return Math.abs(h);
        } catch (Exception e) {
            return input.hashCode() & 0x7FFFFFFF;
        }
    }
}
