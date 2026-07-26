package com.ksp.intelligence.converter;

import com.ksp.intelligence.model.domain.CyberPatternType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for {@link CyberPatternType} ↔ {@code VARCHAR} column.
 * Applies to {@code cyber_trend_alerts.pattern_type}.
 */
@Converter(autoApply = true)
public class CyberPatternTypeConverter implements AttributeConverter<CyberPatternType, String> {

    @Override
    public String convertToDatabaseColumn(CyberPatternType attr) {
        return attr == null ? null : attr.dbValue();
    }

    @Override
    public CyberPatternType convertToEntityAttribute(String dbData) {
        return CyberPatternType.fromDb(dbData);
    }
}
