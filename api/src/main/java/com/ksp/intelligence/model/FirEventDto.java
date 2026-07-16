package com.ksp.intelligence.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.Objects;

/**
 * Immutable Kafka payload representing a single FIR (First Information Report)
 * event on the {@code fir-events} topic. Produced by {@code data-generator/kafka_producer.py}
 * and consumed by the three Spring Boot consumer groups in Phase 2.
 *
 * JSON shape (matches data-generator output):
 * <pre>
 * {
 *   "fir_id":         "LIVE00000001",
 *   "station_code":   "STBLRURB001",
 *   "district_code":  "BLR_URB",
 *   "taluk_code":     "BLR_URB_001",
 *   "crime_type":     "robbery",
 *   "crime_subtype":  "armed_robbery",
 *   "latitude":       12.9716,
 *   "longitude":      77.5946,
 *   "incident_ts":    "2026-07-16T09:18:00Z",
 *   "registered_ts":  "2026-07-16T09:18:00Z",
 *   "offender_id":    "OFF00000015",
 *   "victim_id":      "VIC00000020",
 *   "modus_operandi": "weapon_threat, night_target",
 *   "status":         "OPEN"
 * }
 * </pre>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(of = {"firId", "districtCode", "crimeType", "incidentTs"})
@JsonIgnoreProperties(ignoreUnknown = true)
@com.fasterxml.jackson.databind.annotation.JsonNaming(com.fasterxml.jackson.databind.PropertyNamingStrategies.SnakeCaseStrategy.class)
public class FirEventDto {

    @com.fasterxml.jackson.annotation.JsonProperty("fir_id")
    private String firId;
    @com.fasterxml.jackson.annotation.JsonProperty("station_code")
    private String stationCode;
    @com.fasterxml.jackson.annotation.JsonProperty("district_code")
    private String districtCode;
    @com.fasterxml.jackson.annotation.JsonProperty("taluk_code")
    private String talukCode;
    @com.fasterxml.jackson.annotation.JsonProperty("crime_type")
    private String crimeType;
    @com.fasterxml.jackson.annotation.JsonProperty("crime_subtype")
    private String crimeSubtype;
    @com.fasterxml.jackson.annotation.JsonProperty("latitude")
    private Double latitude;
    @com.fasterxml.jackson.annotation.JsonProperty("longitude")
    private Double longitude;

    @com.fasterxml.jackson.annotation.JsonProperty("incident_ts")
    private Instant incidentTs;

    @com.fasterxml.jackson.annotation.JsonProperty("registered_ts")
    private Instant registeredTs;

    @com.fasterxml.jackson.annotation.JsonProperty("offender_id")
    private String offenderId;
    @com.fasterxml.jackson.annotation.JsonProperty("victim_id")
    private String victimId;
    @com.fasterxml.jackson.annotation.JsonProperty("modus_operandi")
    private String modusOperandi;

    @Builder.Default
    private String status = "OPEN";

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FirEventDto that = (FirEventDto) o;
        return Objects.equals(firId, that.firId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(firId);
    }
}
