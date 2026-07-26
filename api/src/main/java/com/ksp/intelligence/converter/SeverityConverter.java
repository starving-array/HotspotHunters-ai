package com.ksp.intelligence.converter;

import com.ksp.intelligence.model.domain.Severity;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for {@link Severity} ↔ {@code VARCHAR} column.
 *
 * <p>Applies to {@code threat_level} (cyber_trend_alerts) and
 * {@code cyber_severity} (casemaster). Register with
 * {@code @Convert(converter = SeverityConverter.class)} on the entity field,
 * or set {@code autoApply = true} to apply to all Severity-typed fields.</p>
 */
@Converter(autoApply = true)
public class SeverityConverter implements AttributeConverter<Severity, String> {

    @Override
    public String convertToDatabaseColumn(Severity attr) {
        return attr == null ? null : attr.dbValue();
    }

    @Override
    public Severity convertToEntityAttribute(String dbData) {
        return Severity.fromDb(dbData);
    }
}
