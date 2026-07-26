package com.ksp.intelligence.model.domain;

/**
 * Case category — mirrors the seeded rows of the {@code CaseCategory}
 * lookup table ({@code LookupValue} column UNIQUE).
 *
 * <p>Renamed from {@code CaseCategory} to avoid a name clash with the
 * JPA entity {@link com.ksp.intelligence.model.CaseCategory}.</p>
 *
 * <p>Mirrors the frontend enum {@code CaseStatus} (which mirrors the
 * casestatusmaster row strings); this enum is the case-category vocabulary
 * (FIR/UDR/PAR/Zero FIR) per the CCTNS spec.</p>
 */
public enum CaseCategoryValue {
    FIR("FIR"),
    UDR("UDR"),
    PAR("PAR"),
    ZERO_FIR("Zero FIR");

    private final String dbValue;

    CaseCategoryValue(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static CaseCategoryValue fromDb(String s) {
        if (s == null) return null;
        for (CaseCategoryValue v : values()) {
            if (v.dbValue.equalsIgnoreCase(s)) return v;
        }
        throw new IllegalArgumentException("Unknown case category: " + s);
    }
}
