package com.lianyu.service.security;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "lianyu.client-attestation")
public class ClientAttestationProperties {

    /** When true, logged-in /api/** requests must present valid attestation headers. */
    private boolean enforce = false;

    /** Minimum electron semver (inclusive), e.g. 0.2.123 */
    private String minClientVersion = "0.2.123";

    /** Allowed build IDs; empty = allow any build ID for matching min version. */
    private List<String> allowedBuildIds = new ArrayList<>();

    /** Timestamp skew window in seconds. */
    private long timestampSkewSeconds = 300;

    /** Device secret TTL in Redis (days). */
    private int deviceSecretTtlDays = 90;

    /** Nonce TTL in Redis (seconds). */
    private int nonceTtlSeconds = 600;

    /** Max signature failures per deviceId per minute before temporary block. */
    private int maxFailuresPerMinute = 20;
}
