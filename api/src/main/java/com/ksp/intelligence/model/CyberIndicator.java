package com.ksp.intelligence.model;

import com.ksp.intelligence.model.domain.IndicatorType;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "cyber_indicators")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CyberIndicator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "indicator_id")
    private Integer indicatorId;

    @Column(name = "casemasterid", nullable = false)
    private Integer casemasterId;

    @Column(name = "indicator_type", nullable = false, length = 50)
    private IndicatorType indicatorType;

    @Column(name = "indicator_value", nullable = false, length = 500)
    private String indicatorValue;

    @Column(name = "platform", length = 100)
    private String platform;

    @Column(name = "extracted_from", columnDefinition = "TEXT")
    private String extractedFrom;

    @Column(name = "first_seen", nullable = false)
    private Instant firstSeen;

    @Column(name = "last_seen", nullable = false)
    private Instant lastSeen;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
