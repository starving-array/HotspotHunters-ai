package com.ksp.intelligence.converter;

import com.ksp.intelligence.model.domain.ChargesheetType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for {@link ChargesheetType} ↔ {@code CHAR(1)} column.
 * Applies to {@code ChargesheetDetails.cstype}.
 *
 * <p>Note: CHAR(1) columns on PostgreSQL behave like VARCHAR(1) for reads,
 * so the converter works against a {@code String} column type. Trailing
 * spaces in {@code convertToDatabaseColumn} output would be stripped by PG.</p>
 */
@Converter(autoApply = true)
public class ChargesheetTypeConverter implements AttributeConverter<ChargesheetType, String> {

    @Override
    public String convertToDatabaseColumn(ChargesheetType attr) {
        return attr == null ? null : String.valueOf(attr.dbValue());
    }

    @Override
    public ChargesheetType convertToEntityAttribute(String dbData) {
        return ChargesheetType.fromDb(dbData);
    }
}
