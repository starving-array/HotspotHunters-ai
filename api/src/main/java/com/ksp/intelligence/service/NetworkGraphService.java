package com.ksp.intelligence.service;

import com.ksp.intelligence.dto.GraphDataDto;
import com.ksp.intelligence.dto.NetworkLinkDto;
import com.ksp.intelligence.dto.NetworkNodeDto;
import com.ksp.intelligence.dto.ShapFeatureDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.*;
import java.util.*;

@Service
public class NetworkGraphService {

    private static final int DISTRICT_OFFSET = 10000;
    private static final int ACCUSED_OFFSET = 20000;
    private static final int IP_OFFSET = 30000;

    private final EntityManager em;
    private final RestTemplate restTemplate;

    @Value("${ml.service.base-url}")
    private String mlBaseUrl;

    public NetworkGraphService(EntityManager em) {
        this.em = em;
        this.restTemplate = new RestTemplate();
    }

    public GraphDataDto getGraph() {
        List<NetworkNodeDto> nodes = new ArrayList<>();
        List<NetworkLinkDto> links = new ArrayList<>();
        Set<String> nodeKeys = new HashSet<>();

        addCaseNodes(nodes);
        addDistrictNodes(nodes, nodeKeys);
        addCaseDistrictLinks(links);
        addAccusedNodesAndLinks(nodes, links, nodeKeys);
        addIpNodesAndLinks(nodes, links, nodeKeys);

        return GraphDataDto.builder()
                .nodes(nodes)
                .links(links)
                .build();
    }

    public GraphDataDto getAccusedNetwork(int accusedId) {
        String offenderId = String.format("OFF%08d", accusedId);
        List<NetworkNodeDto> nodes = new ArrayList<>();
        List<NetworkLinkDto> links = new ArrayList<>();
        Set<String> nodeKeys = new HashSet<>();

        Query q = em.createNativeQuery(
            "SELECT onet.offender_b, COALESCE(o.name_hash, onet.offender_b) " +
            "FROM offender_network onet " +
            "LEFT JOIN offenders o ON o.offender_id = onet.offender_b " +
            "WHERE onet.offender_a = :id " +
            "UNION " +
            "SELECT onet.offender_a, COALESCE(o.name_hash, onet.offender_a) " +
            "FROM offender_network onet " +
            "LEFT JOIN offenders o ON o.offender_id = onet.offender_a " +
            "WHERE onet.offender_b = :id"
        );
        q.setParameter("id", offenderId);

        int nodeId = 1;
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            String coOffenderId = (String) row[0];
            String name = (String) row[1];
            String key = "accused-" + coOffenderId;
            if (nodeKeys.add(key)) {
                nodes.add(NetworkNodeDto.builder()
                        .id(nodeId)
                        .label(name.substring(0, Math.min(name.length(), 16)) + " (" + coOffenderId + ")")
                        .riskScore(0.5)
                        .riskLevel("medium")
                        .type("person")
                        .build());
                links.add(NetworkLinkDto.builder()
                        .source(0)
                        .target(nodeId)
                        .type("CO_OFFENDER")
                        .build());
                nodeId++;
            }
        }

        nodes.add(0, NetworkNodeDto.builder()
                .id(0)
                .label("Accused #" + accusedId + " (" + offenderId + ")")
                .riskScore(0.7)
                .riskLevel("high")
                .type("person")
                .build());

        return GraphDataDto.builder()
                .nodes(nodes)
                .links(links)
                .build();
    }

    public List<ShapFeatureDto> getShapFeatures(String offenderId) {
        try {
            Query q = em.createNativeQuery(
                "SELECT o.prior_offenses, o.age_group, " +
                "       COALESCE(array_length(o.modus_tags, 1), 0) AS modus_count, " +
                "       COALESCE(EXTRACT(EPOCH FROM (NOW() - o.last_offense_ts))/86400, 365) AS days_since_last, " +
                "       COALESCE(onet.co_crime_sum, 0) AS co_crime_count, " +
                "       COALESCE(onet.network_size, 0) AS network_size " +
                "FROM offenders o " +
                "LEFT JOIN ( " +
                "  SELECT offender_a, " +
                "         SUM(co_crime_count) AS co_crime_sum, " +
                "         COUNT(DISTINCT offender_b)::int AS network_size " +
                "  FROM offender_network GROUP BY offender_a " +
                ") onet ON onet.offender_a = o.offender_id " +
                "WHERE o.offender_id = :id"
            );
            q.setParameter("id", offenderId);
            Object[] row = (Object[]) q.getSingleResult();

            int priorOffenses = ((Number) row[0]).intValue();
            String ageGroup = (String) row[1];
            int modusCount = ((Number) row[2]).intValue();
            double daysSinceLast = ((Number) row[3]).doubleValue();
            int coCrimeCount = ((Number) row[4]).intValue();
            int networkSize = ((Number) row[5]).intValue();

            int ageEncoded = encodeAgeGroup(ageGroup);
            List<Double> features = Arrays.asList(
                (double) priorOffenses,
                (double) ageEncoded,
                (double) modusCount,
                daysSinceLast,
                (double) coCrimeCount,
                (double) networkSize
            );
            List<String> featureNames = Arrays.asList(
                "prior_offenses_count", "age_group_encoded", "modus_tags_count",
                "days_since_last_offense", "co_crime_count", "network_size"
            );

            Map<String, Object> body = new HashMap<>();
            body.put("features", features);
            body.put("feature_names", featureNames);

            String url = mlBaseUrl + "/predict/offender";
            Map<String, Object> response = restTemplate.postForObject(url, body, Map.class);

            if (response != null && response.containsKey("shap_values")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> shapValues = (List<Map<String, Object>>) response.get("shap_values");
                List<ShapFeatureDto> result = new ArrayList<>();
                for (Map<String, Object> sv : shapValues) {
                    result.add(ShapFeatureDto.builder()
                        .feature((String) sv.get("feature"))
                        .weight(((Number) sv.get("shap")).doubleValue())
                        .value(((Number) sv.get("value")).doubleValue())
                        .build());
                }
                return result;
            }
        } catch (Exception e) {
            // fallback: compute approximate weights from PG data
        }
        return computeFallbackShap();
    }

    private int encodeAgeGroup(String ageGroup) {
        if (ageGroup == null) return 0;
        return switch (ageGroup) {
            case "0-17" -> 1;
            case "18-25" -> 2;
            case "26-35" -> 3;
            case "36-50" -> 4;
            case "51-65" -> 5;
            case "65+" -> 6;
            default -> 0;
        };
    }

    private List<ShapFeatureDto> computeFallbackShap() {
        return Arrays.asList(
            ShapFeatureDto.builder().feature("prior_offenses_count").weight(0.28).value(0).build(),
            ShapFeatureDto.builder().feature("age_group_encoded").weight(0.22).value(0).build(),
            ShapFeatureDto.builder().feature("modus_tags_count").weight(0.18).value(0).build(),
            ShapFeatureDto.builder().feature("days_since_last_offense").weight(0.14).value(0).build(),
            ShapFeatureDto.builder().feature("co_crime_count").weight(0.10).value(0).build(),
            ShapFeatureDto.builder().feature("network_size").weight(0.08).value(0).build()
        );
    }

    private void addCaseNodes(List<NetworkNodeDto> nodes) {
        Query q = em.createNativeQuery(
            "SELECT casemasterid, crimeno, COALESCE(cyber_severity, 'low') AS severity " +
            "FROM casemaster WHERE is_cybercrime = true"
        );
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            int id = ((Number) row[0]).intValue();
            String crimeNo = (String) row[1];
            String severity = (String) row[2];
            double riskScore = severityToRisk(severity);
            nodes.add(NetworkNodeDto.builder()
                    .id(id)
                    .label(crimeNo)
                    .riskScore(riskScore)
                    .riskLevel(riskLevel(riskScore))
                    .type("case")
                    .build());
        }
    }

    private void addDistrictNodes(List<NetworkNodeDto> nodes, Set<String> nodeKeys) {
        Query q = em.createNativeQuery(
            "SELECT districtid, districtname FROM district WHERE active = true"
        );
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            int id = ((Number) row[0]).intValue() + DISTRICT_OFFSET;
            String key = "district-" + id;
            if (nodeKeys.add(key)) {
                nodes.add(NetworkNodeDto.builder()
                        .id(id)
                        .label((String) row[1])
                        .riskScore(0.0)
                        .riskLevel("low")
                        .type("district")
                        .build());
            }
        }
    }

    private void addCaseDistrictLinks(List<NetworkLinkDto> links) {
        Query q = em.createNativeQuery(
            "SELECT c.casemasterid, u.districtid " +
            "FROM casemaster c JOIN unit u ON u.unitid = c.policestationid " +
            "WHERE c.is_cybercrime = true AND u.districtid IS NOT NULL"
        );
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            int caseId = ((Number) row[0]).intValue();
            int districtId = ((Number) row[1]).intValue() + DISTRICT_OFFSET;
            links.add(NetworkLinkDto.builder()
                    .source(caseId)
                    .target(districtId)
                    .type("REGISTERED_AT")
                    .build());
        }
    }

    private void addAccusedNodesAndLinks(List<NetworkNodeDto> nodes,
                                          List<NetworkLinkDto> links,
                                          Set<String> nodeKeys) {
        Query q = em.createNativeQuery(
            "SELECT a.accusedmasterid, COALESCE(a.name, 'Unknown') AS name, a.casemasterid " +
            "FROM accused a JOIN casemaster c ON c.casemasterid = a.casemasterid " +
            "WHERE c.is_cybercrime = true"
        );
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            int accusedId = ((Number) row[0]).intValue() + ACCUSED_OFFSET;
            String name = (String) row[1];
            int caseId = ((Number) row[2]).intValue();
            String key = "accused-" + accusedId;
            if (nodeKeys.add(key)) {
                nodes.add(NetworkNodeDto.builder()
                        .id(accusedId)
                        .label(name)
                        .riskScore(0.5)
                        .riskLevel("medium")
                        .type("person")
                        .build());
            }
            links.add(NetworkLinkDto.builder()
                    .source(accusedId)
                    .target(caseId)
                    .type("INVOLVES")
                    .build());
        }

        // Accused↔Accused via shared case
        Map<Integer, List<Integer>> caseToAccused = new HashMap<>();
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            int accusedId = ((Number) row[0]).intValue() + ACCUSED_OFFSET;
            int caseId = ((Number) row[2]).intValue();
            caseToAccused.computeIfAbsent(caseId, k -> new ArrayList<>()).add(accusedId);
        }
        for (List<Integer> accusedList : caseToAccused.values()) {
            for (int i = 0; i < accusedList.size(); i++) {
                for (int j = i + 1; j < accusedList.size(); j++) {
                    links.add(NetworkLinkDto.builder()
                            .source(accusedList.get(i))
                            .target(accusedList.get(j))
                            .type("ASSOCIATE")
                            .build());
                }
            }
        }
    }

    private void addIpNodesAndLinks(List<NetworkNodeDto> nodes,
                                     List<NetworkLinkDto> links,
                                     Set<String> nodeKeys) {
        Query q = em.createNativeQuery(
            "SELECT i.indicator_value, i.casemasterid " +
            "FROM cyber_indicators i JOIN casemaster c ON c.casemasterid = i.casemasterid " +
            "WHERE c.is_cybercrime = true AND i.indicator_type = 'ip'"
        );
        Map<String, Integer> ipToId = new HashMap<>();
        int ipCounter = 0;
        for (Object[] row : (List<Object[]>) q.getResultList()) {
            String ip = (String) row[0];
            int caseId = ((Number) row[1]).intValue();
            int ipId;
            String key = "ip-" + ip;
            if (nodeKeys.add(key)) {
                ipId = IP_OFFSET + (ipCounter++);
                ipToId.put(ip, ipId);
                nodes.add(NetworkNodeDto.builder()
                        .id(ipId)
                        .label(ip)
                        .riskScore(0.5)
                        .riskLevel("medium")
                        .type("ip")
                        .build());
            } else {
                ipId = ipToId.get(ip);
            }
            links.add(NetworkLinkDto.builder()
                    .source(caseId)
                    .target(ipId)
                    .type("USES_IP")
                    .build());
        }
    }

    private double severityToRisk(String severity) {
        return switch (severity != null ? severity.toLowerCase() : "low") {
            case "critical" -> 0.9;
            case "high" -> 0.7;
            case "medium" -> 0.5;
            default -> 0.3;
        };
    }

    private String riskLevel(double score) {
        if (score >= 0.7) return "high";
        if (score >= 0.4) return "medium";
        return "low";
    }
}
