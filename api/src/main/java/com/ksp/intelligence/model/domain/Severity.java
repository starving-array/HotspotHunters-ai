package com.ksp.intelligence.model.domain;

/**
 * Severity / threat-level enum — mirrors the CHECK constraint on
 * {@code cyber_trend_alerts.threat_level} and {@code casemaster.cyber_severity}.
 *
 * <p>Values are lowercase strings matching the DB column exactly, so
 * {@link #name()} and the persisted value stay in sync via an
 * {@link jakarta.persistence.AttributeConverter}.</p>
 *
 * <p>Mirrors the frontend enum {@code frontend/src/types/enums.ts → Severity}.
 * Note: the legacy {@link com.ksp.intelligence.model.AlertEvent.Severity}
 * only defines MEDIUM/HIGH (used by the z-score anomaly publisher); this
 * enum is the full four-level domain vocabulary.</p>
 */
public enum Severity {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high"),
    CRITICAL("critical");

    private final String dbValue;

    Severity(String dbValue) {
        this.dbValue = dbValue;
    }

    /** Value persisted in the {@code threat_level} / {@code cyber_severity} column. */
    public String dbValue() {
        return dbValue;
    }

    /** Parse a DB string into the enum, throwing on unknown values. */
    public static Severity fromDb(String s) {
        if (s == null) return null;
        for (Severity v : values()) {
            if (v.dbValue.equalsIgnoreCase(s)) return v;
        }
        throw new IllegalArgumentException("Unknown severity: " + s);
    }
}
