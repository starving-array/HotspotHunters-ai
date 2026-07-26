package com.ksp.intelligence.model.domain;

/**
 * Gravity of offence — mirrors the seeded rows of the {@code GravityOffence}
 * lookup table ({@code LookupValue} column UNIQUE).
 */
public enum GravityOfOffence {
    HEINOUS("Heinous"),
    NON_HEINOUS("Non-Heinous");

    private final String dbValue;

    GravityOfOffence(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static GravityOfOffence fromDb(String s) {
        if (s == null) return null;
        for (GravityOfOffence v : values()) {
            if (v.dbValue.equalsIgnoreCase(s)) return v;
        }
        throw new IllegalArgumentException("Unknown gravity of offence: " + s);
    }
}
