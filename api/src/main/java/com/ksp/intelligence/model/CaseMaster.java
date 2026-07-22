package com.ksp.intelligence.model;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "BriefFacts", columnDefinition = "TEXT")
    private String briefFacts;
}