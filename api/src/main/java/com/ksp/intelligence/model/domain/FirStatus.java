package com.ksp.intelligence.model.domain;

/**
 * FIR lifecycle status — mirrors the values used by the data generator
 * ({@code data-generator/config.py → FIR_STATUSES}) and the default
 * {@code 'OPEN'} on {@code fir_records.status}.
 *
 * <p>Column is VARCHAR(20) with no CHECK constraint, but the value set is
 * fixed by the generator contract. Mirrors the frontend enum
 * {@code CaseStatus} (which uses the casestatusmaster row strings; this
 * enum is the fir_records-level vocabulary).</p>
 */
public enum FirStatus {
    OPEN("OPEN"),
    INVESTIGATING("INVESTIGATING"),
    CHARGED("CHARGED"),
    CLOSED("CLOSED"),
    REOPENED("REOPENED");

    private final String dbValue;

    FirStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static FirStatus fromDb(String s) {
        if (s == null) return null;
        for (FirStatus v : values()) {
            if (v.dbValue.equalsIgnoreCase(s)) return v;
        }
        throw new IllegalArgumentException("Unknown FIR status: " + s);
    }
}
