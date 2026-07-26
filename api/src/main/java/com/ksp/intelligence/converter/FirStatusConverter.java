package com.ksp.intelligence.converter;

import com.ksp.intelligence.model.domain.FirStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for {@link FirStatus} ↔ {@code VARCHAR} column.
 * Applies to {@code fir_records.status}.
 */
@Converter(autoApply = true)
public class FirStatusConverter implements AttributeConverter<FirStatus, String> {

    @Override
    public String convertToDatabaseColumn(FirStatus attr) {
        return attr == null ? null : attr.dbValue();
    }

    @Override
    public FirStatus convertToEntityAttribute(String dbData) {
        return FirStatus.fromDb(dbData);
    }
}
