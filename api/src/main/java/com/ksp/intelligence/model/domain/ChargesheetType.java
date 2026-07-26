package com.ksp.intelligence.model.domain;

/**
 * Chargesheet type — mirrors the single-char {@code cstype} column on
 * {@code ChargesheetDetails} (CHAR(1), default 'A').
 *
 * <p>Values per {@code migrations/003_entity_tables.sql} comment:
 * A = Chargesheet, B = False Case, C = Undetected.</p>
 */
public enum ChargesheetType {
    A('A'),
    B('B'),
    C('C');

    private final char dbValue;

    ChargesheetType(char dbValue) {
        this.dbValue = dbValue;
    }

    public char dbValue() {
        return dbValue;
    }

    public static ChargesheetType fromDb(String s) {
        if (s == null || s.isEmpty()) return null;
        char c = s.charAt(0);
        for (ChargesheetType v : values()) {
            if (v.dbValue == c) return v;
        }
        throw new IllegalArgumentException("Unknown chargesheet type: " + s);
    }
}
