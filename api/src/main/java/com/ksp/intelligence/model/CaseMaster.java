package com.ksp.intelligence.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "CaseMaster")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CaseMaster {

    @EmbeddedId
    private CaseMasterKey id;

    @Column(name = "CrimeNo", nullable = false, length = 18)
    private String crimeNo;

    @Column(name = "CaseNo")
    private String caseNo;

    @Column(name = "CrimeRegisteredDate", nullable = false)
    private LocalDate crimeRegisteredDate; // duplicate of key field for convenience

    @Column(name = "PolicePersonID")
    private Integer policePersonId;

    @Column(name = "PoliceStationID")
    private Integer policeStationId;

    @Column(name = "CaseCategoryID")
    private Integer caseCategoryId;

    @Column(name = "GravityOffenceID")
    private Integer gravityOffenceId;

    @Column(name = "CrimeMajorHeadID")
    private Integer crimeMajorHeadId;

    @Column(name = "CrimeMinorHeadID")
    private Integer crimeMinorHeadId;

    @Column(name = "CaseStatusID")
    private Integer caseStatusId;

    @Column(name = "CourtID")
    private Integer courtId;

    @Column(name = "IncidentFromDate")
    private LocalDateTime incidentFromDate;

    @Column(name = "IncidentToDate")
    private LocalDateTime incidentToDate;

    @Column(name = "InfoReceivedPSDate")
    private LocalDateTime infoReceivedPsDate;

    @Column(name = "latitude", precision = 10, scale = 7)
    private Double latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private Double longitude;

    @Column(name = "BriefFacts", columnDefinition = "TEXT")
    private String briefFacts;
}