package com.lianyu.service.security;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClientAttestationService {

    public static final String HEADER_CLIENT = "X-LianYu-Client";
    public static final String HEADER_DEVICE = "X-LianYu-Device-Id";
    public static final String HEADER_TIMESTAMP = "X-LianYu-Timestamp";
    public static final String HEADER_NONCE = "X-LianYu-Nonce";
    public static final String HEADER_SIGNATURE = "X-LianYu-Signature";
    public static final String REQUEST_ATTR_ATTESTED = "lianyu.clientAttested";

    private static final Pattern CLIENT_PATTERN =
            Pattern.compile("^electron/(\\d+\\.\\d+\\.\\d+)/([A-Za-z0-9._-]+)$");

    private final StringRedisTemplate redis;
    private final ClientAttestationProperties properties;
    private final ObjectMapper objectMapper;

    public record DeviceCredentials(String deviceId, String deviceSecret) {}

    public record VerifyResult(boolean ok, boolean attested) {}

    public DeviceCredentials issueCredentials(
            Long userId, String existingDeviceId, String clientHeader, String buildIdHint) {
        if (!StringUtils.hasText(clientHeader)) {
            return null;
        }
        ClientInfo client = parseClientHeader(clientHeader, buildIdHint);
        if (client == null || !isClientVersionAllowed(client.version())) {
            log.warn("Client attestation issue rejected: invalid client header");
            return null;
        }
        String deviceId = resolveDeviceId(userId, existingDeviceId);
        String secret = randomSecret();
        storeDeviceSecret(userId, deviceId, secret);
        return new DeviceCredentials(deviceId, secret);
    }

    public VerifyResult verifyAuthenticatedRequest(
            Long userId,
            String method,
            String path,
            byte[] body,
            String clientHeader,
            String deviceId,
            String timestampHeader,
            String nonceHeader,
            String signatureHeader) {
        if (!properties.isEnforce()) {
            return new VerifyResult(true, false);
        }
        if (!StringUtils.hasText(clientHeader)
                || !StringUtils.hasText(deviceId)
                || !StringUtils.hasText(timestampHeader)
                || !StringUtils.hasText(nonceHeader)
                || !StringUtils.hasText(signatureHeader)) {
            return new VerifyResult(false, false);
        }
        ClientInfo client = parseClientHeader(clientHeader, null);
        if (client == null || !isClientVersionAllowed(client.version())) {
            return new VerifyResult(false, false);
        }
        long timestamp;
        try {
            timestamp = Long.parseLong(timestampHeader.trim());
        } catch (NumberFormatException ex) {
            return new VerifyResult(false, false);
        }
        long now = System.currentTimeMillis() / 1000;
        if (Math.abs(now - timestamp) > properties.getTimestampSkewSeconds()) {
            return new VerifyResult(false, false);
        }
        String nonce = nonceHeader.trim();
        if (nonce.length() < 8 || nonce.length() > 64) {
            return new VerifyResult(false, false);
        }
        String nonceKey = "client:attest:nonce:" + deviceId + ":" + nonce;
        Boolean firstUse = redis.opsForValue().setIfAbsent(
                nonceKey, "1", Duration.ofSeconds(properties.getNonceTtlSeconds()));
        if (!Boolean.TRUE.equals(firstUse)) {
            return new VerifyResult(false, false);
        }

        String secret = loadDeviceSecret(userId, deviceId);
        if (!StringUtils.hasText(secret)) {
            recordFailure(deviceId);
            return new VerifyResult(false, false);
        }

        String bodyHash = sha256Hex(body != null ? body : new byte[0]);
        String canonical = canonicalString(method, path, timestamp, nonce, bodyHash);
        String expected = hmacSha256Hex(secret, canonical);
        if (!MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signatureHeader.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8))) {
            recordFailure(deviceId);
            return new VerifyResult(false, false);
        }
        if (isTemporarilyBlocked(deviceId)) {
            return new VerifyResult(false, false);
        }
        return new VerifyResult(true, true);
    }

    public boolean isEnforced() {
        return properties.isEnforce();
    }

    private String resolveDeviceId(Long userId, String existingDeviceId) {
        if (StringUtils.hasText(existingDeviceId)) {
            String existing = loadDeviceSecret(userId, existingDeviceId.trim());
            if (StringUtils.hasText(existing)) {
                return existingDeviceId.trim();
            }
        }
        return UUID.randomUUID().toString().replace("-", "");
    }

    private void storeDeviceSecret(Long userId, String deviceId, String secret) {
        DeviceRecord record = new DeviceRecord(userId, secret);
        try {
            String json = objectMapper.writeValueAsString(record);
            redis.opsForValue().set(
                    deviceKey(deviceId),
                    json,
                    Duration.ofDays(properties.getDeviceSecretTtlDays()));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to store device attestation secret", ex);
        }
    }

    private String loadDeviceSecret(Long userId, String deviceId) {
        String json = redis.opsForValue().get(deviceKey(deviceId));
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            DeviceRecord record = objectMapper.readValue(json, DeviceRecord.class);
            if (record.userId() == null || !record.userId().equals(userId)) {
                return null;
            }
            return record.secret();
        } catch (Exception ex) {
            log.debug("Invalid device record for deviceId={}", deviceId);
            return null;
        }
    }

    private void recordFailure(String deviceId) {
        String key = "client:attest:fail:" + deviceId;
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redis.expire(key, Duration.ofMinutes(1));
        }
    }

    private boolean isTemporarilyBlocked(String deviceId) {
        String key = "client:attest:fail:" + deviceId;
        String val = redis.opsForValue().get(key);
        if (!StringUtils.hasText(val)) {
            return false;
        }
        try {
            return Long.parseLong(val) >= properties.getMaxFailuresPerMinute();
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private ClientInfo parseClientHeader(String clientHeader, String buildIdHint) {
        Matcher m = CLIENT_PATTERN.matcher(clientHeader.trim());
        if (!m.matches()) {
            return null;
        }
        String version = m.group(1);
        String buildId = m.group(2);
        if (StringUtils.hasText(buildIdHint) && !buildIdHint.equals(buildId)) {
            return null;
        }
        if (!properties.getAllowedBuildIds().isEmpty()
                && !properties.getAllowedBuildIds().contains(buildId)) {
            return null;
        }
        return new ClientInfo(version, buildId);
    }

    private boolean isClientVersionAllowed(String version) {
        return compareSemver(version, properties.getMinClientVersion()) >= 0;
    }

    static int compareSemver(String a, String b) {
        int[] av = parseSemver(a);
        int[] bv = parseSemver(b);
        for (int i = 0; i < 3; i++) {
            if (av[i] != bv[i]) {
                return Integer.compare(av[i], bv[i]);
            }
        }
        return 0;
    }

    private static int[] parseSemver(String version) {
        String[] parts = version.split("\\.");
        int[] out = new int[3];
        for (int i = 0; i < 3; i++) {
            out[i] = i < parts.length ? Integer.parseInt(parts[i]) : 0;
        }
        return out;
    }

    static String canonicalString(String method, String path, long timestamp, String nonce, String bodyHash) {
        return method.toUpperCase(Locale.ROOT)
                + "\n"
                + path
                + "\n"
                + timestamp
                + "\n"
                + nonce
                + "\n"
                + bodyHash;
    }

    static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    static String hmacSha256Hex(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static String randomSecret() {
        return HexFormat.of().formatHex(UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8))
                + HexFormat.of().formatHex(UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String deviceKey(String deviceId) {
        return "client:attest:device:" + deviceId;
    }

    private record ClientInfo(String version, String buildId) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DeviceRecord(Long userId, String secret) {}
}
