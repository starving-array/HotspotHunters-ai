package com.ksp.intelligence.model.domain;

/**
 * Cybercrime pattern type — mirrors the CHECK constraint on
 * {@code cyber_trend_alerts.pattern_type}.
 *
 * <p>Mirrors the frontend enum {@code frontend/src/types/enums.ts → CyberPatternType}.
 * Values are lowercase snake_case matching the DB column exactly.</p>
 */
public enum CyberPatternType {
    IP_CLUSTER("ip_cluster"),
    DOMAIN_CLUSTER("domain_cluster"),
    PHONE_CLUSTER("phone_cluster"),
    WALLET_CLUSTER("wallet_cluster"),
    PLATFORM_SPIKE("platform_spike"),
    FINANCIAL_FRAUD_RING("financial_fraud_ring");

    private final String dbValue;

    CyberPatternType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static CyberPatternType fromDb(String s) {
        if (s == null) return null;
        for (CyberPatternType v : values()) {
            if (v.dbValue.equalsIgnoreCase(s)) return v;
        }
        throw new IllegalArgumentException("Unknown cyber pattern type: " + s);
    }
}
