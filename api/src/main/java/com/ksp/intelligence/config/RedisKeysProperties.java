package com.ksp.intelligence.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Type-safe holder for {@code ksp.redis.*} keys. Centralizes naming so consumers
 * and (Phase 3) controllers share the same strings.
 */
@Configuration
@ConfigurationProperties(prefix = "ksp.redis")
public class RedisKeysProperties {

    private String hotspotsKey = "hotspots:live";
    private String district24hPrefix = "district:24h:";
    private String districtRollupPrefix = "district:rollup:60:";
    private String districtBaselinePrefix = "district:baseline:24h:";
    private String streamKey = "alerts:stream";
    private int streamMaxlen = 500;

    public String getHotspotsKey() { return hotspotsKey; }
    public void setHotspotsKey(String v) { this.hotspotsKey = v; }
    public String getDistrict24hPrefix() { return district24hPrefix; }
    public void setDistrict24hPrefix(String v) { this.district24hPrefix = v; }
    public String getDistrictRollupPrefix() { return districtRollupPrefix; }
    public void setDistrictRollupPrefix(String v) { this.districtRollupPrefix = v; }
    public String getDistrictBaselinePrefix() { return districtBaselinePrefix; }
    public void setDistrictBaselinePrefix(String v) { this.districtBaselinePrefix = v; }
    public String getStreamKey() { return streamKey; }
    public void setStreamKey(String v) { this.streamKey = v; }
    public int getStreamMaxlen() { return streamMaxlen; }
    public void setStreamMaxlen(int v) { this.streamMaxlen = v; }
}
