package com.ksp.intelligence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.EqualsAndHashCode;

import com.ksp.intelligence.model.domain.FirStatus;

import java.time.Instant;


/**
 * JPA entity for the {@code fir_records} table (PostgreSQL).
 *
 * NOTE: postgres {@code fir_records} is declared with PRIMARY KEY (fir_id, incident_ts)
 * for monthly partitioning support. JPA models it with only {@code fir_id} as @Id —
 * partition routing happens server-side and is transparent to the application.
 * We include {@code incident_ts} here as a required non-null column.
 */
@Entity
@Table(name = "fir_records")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(of = {"firId", "districtCode", "crimeType", "incidentTs"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class FirRecord {

@Id
@EqualsAndHashCode.Include
@Column(name = "fir_id", length = 20, nullable = false, updatable = false)
private String firId;

    @Column(name = "station_code", length = 20, nullable = false)
    private String stationCode;

    @Column(name = "district_code", length = 20, nullable = false)
    private String districtCode;

    @Column(name = "taluk_code", length = 20, nullable = false)
    private String talukCode;

    @Column(name = "crime_type", length = 50, nullable = false)
    private String crimeType;

    @Column(name = "crime_subtype", length = 100)
    private String crimeSubtype;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "incident_ts", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Instant incidentTs;

    @Column(name = "registered_ts", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Instant registeredTs;

    @Column(name = "offender_id", length = 20)
    private String offenderId;

    @Column(name = "victim_id", length = 20)
    private String victimId;

    @Column(name = "modus_operandi", columnDefinition = "text")
    private String modusOperandi;

    // -- CATALYST: search_vector column for PostgreSQL full-text search --
    // @Column(name = "search_vector", columnDefinition = "tsvector")
    // private String searchVector;

    @Column(name = "status", length = 20)
    @Builder.Default
    private FirStatus status = FirStatus.OPEN;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    @Builder.Default
    private Instant createdAt = Instant.now();

    /** Conversion from the Kafka DTO — the dual-write indexer in Phase 2 builds the entity from here. */
    public static FirRecord from(FirEventDto dto) {
        return FirRecord.builder()
                .firId(dto.getFirId())
                .stationCode(dto.getStationCode())
                .districtCode(dto.getDistrictCode())
                .talukCode(dto.getTalukCode())
                .crimeType(dto.getCrimeType())
                .crimeSubtype(dto.getCrimeSubtype())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .incidentTs(dto.getIncidentTs())
                .registeredTs(dto.getRegisteredTs() != null ? dto.getRegisteredTs() : Instant.now())
                .offenderId(dto.getOffenderId())
                .victimId(dto.getVictimId())
                .modusOperandi(dto.getModusOperandi())
                .status(FirStatus.fromDb(dto.getStatus() != null ? dto.getStatus() : "OPEN"))
                .build();
    }


}
