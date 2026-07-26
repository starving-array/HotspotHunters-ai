package com.ksp.intelligence.converter;

import com.ksp.intelligence.model.domain.IndicatorType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for {@link IndicatorType} ↔ {@code VARCHAR} column.
 * Applies to {@code cyber_indicators.indicator_type}.
 */
@Converter(autoApply = true)
public class IndicatorTypeConverter implements AttributeConverter<IndicatorType, String> {

    @Override
    public String convertToDatabaseColumn(IndicatorType attr) {
        return attr == null ? null : attr.dbValue();
    }

    @Override
    public IndicatorType convertToEntityAttribute(String dbData) {
        return IndicatorType.fromDb(dbData);
    }
}
