package com.ksp.intelligence.model.domain;

/**
 * Cybercrime indicator type — mirrors the CHECK constraint on
 * {@code cyber_indicators.indicator_type}.
 *
 * <p>Mirrors the frontend enum {@code frontend/src/types/enums.ts → IndicatorType}.
 * Values are lowercase snake_case matching the DB column exactly.</p>
 */
public enum IndicatorType {
    IP("ip"),
    DOMAIN("domain"),
    WALLET("wallet"),
    PHONE("phone"),
    BANK_ACCOUNT("bank_account"),
    SOCIAL_HANDLE("social_handle"),
    EMAIL("email"),
    UPI_ID("upi_id"),
    DEVICE_ID("device_id");

    private final String dbValue;

    IndicatorType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static IndicatorType fromDb(String s) {
        if (s == null) return null;
        for (IndicatorType v : values()) {
            if (v.dbValue.equalsIgnoreCase(s)) return v;
        }
        throw new IllegalArgumentException("Unknown indicator type: " + s);
    }
}
