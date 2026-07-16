package com.ksp.intelligence.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Type-safe holder for the {@code ksp.anomaly.*} properties. Set via application.yml.
 *
 * Defaults align with the architecture doc §4.2:
 *   - rolling-window-minutes: 60 (current window)
 *   - baseline-window-minutes: 1440 (24h baseline)
 *   - spike-threshold-sigma: 2.0  (publish MEDIUM alert)
 *   - high-severity-sigma:  3.0  (publish HIGH alert)
 */
@Configuration
@ConfigurationProperties(prefix = "ksp.anomaly")
public class AnomalyProperties {

    @Min(1)
    private int rollingWindowMinutes = 60;

    @Min(1)
    private int baselineWindowMinutes = 1440;

    private double spikeThresholdSigma = 2.0;
    private double highSeveritySigma = 3.0;

    public int getRollingWindowMinutes() { return rollingWindowMinutes; }
    public void setRollingWindowMinutes(int v) { this.rollingWindowMinutes = v; }
    public int getBaselineWindowMinutes() { return baselineWindowMinutes; }
    public void setBaselineWindowMinutes(int v) { this.baselineWindowMinutes = v; }
    public double getSpikeThresholdSigma() { return spikeThresholdSigma; }
    public void setSpikeThresholdSigma(double v) { this.spikeThresholdSigma = v; }
    public double getHighSeveritySigma() { return highSeveritySigma; }
    public void setHighSeveritySigma(double v) { this.highSeveritySigma = v; }

    public Duration rollingWindow() { return Duration.ofMinutes(rollingWindowMinutes); }
    public Duration baselineWindow() { return Duration.ofMinutes(baselineWindowMinutes); }
}
