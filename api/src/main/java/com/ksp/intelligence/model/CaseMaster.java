package com.ksp.intelligence.model;

import com.ksp.intelligence.model.domain.Severity;
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

    @Column(name = "is_cybercrime", nullable = false)
    private Boolean isCybercrime = false;

    @Column(name = "primary_platform", length = 100)
    private String primaryPlatform;

    @Column(name = "financial_loss", precision = 15, scale = 2)
    private java.math.BigDecimal financialLoss;

    @Column(name = "cyber_severity", length = 20)
    private Severity cyberSeverity;
}