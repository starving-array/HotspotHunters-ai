package com.ksp.intelligence.model;

import com.ksp.intelligence.model.domain.CyberPatternType;
import com.ksp.intelligence.model.domain.Severity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "cyber_trend_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CyberTrendAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_id")
    private Integer alertId;

    @Column(name = "pattern_type", nullable = false, length = 50)
    private CyberPatternType patternType;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_value", length = 500)
    private String entityValue;

    @Column(name = "case_count", nullable = false)
    private Integer caseCount;

    @Column(name = "first_case_id")
    private Integer firstCaseId;

    @Column(name = "last_case_id")
    private Integer lastCaseId;

    @Column(name = "first_seen")
    private Instant firstSeen;

    @Column(name = "last_seen")
    private Instant lastSeen;

    @Column(name = "threat_level", nullable = false, length = 20)
    private Severity threatLevel;

    @Column(name = "details", columnDefinition = "jsonb")
    private String details;
}
