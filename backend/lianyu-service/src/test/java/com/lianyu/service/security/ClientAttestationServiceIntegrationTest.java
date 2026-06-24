package com.lianyu.service.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClientAttestationServiceIntegrationTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private ClientAttestationProperties properties;
    private ClientAttestationService service;
    private final Map<String, String> redisStore = new HashMap<>();

    @BeforeEach
    void setUp() {
        properties = new ClientAttestationProperties();
        properties.setEnforce(true);
        properties.setMinClientVersion("0.2.123");
        service = new ClientAttestationService(redisTemplate, properties, new ObjectMapper());
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class)))
                .thenAnswer(inv -> {
                    String key = inv.getArgument(0);
                    return redisStore.putIfAbsent(key, "1") == null;
                });
        when(valueOperations.get(anyString())).thenAnswer(inv -> redisStore.get(inv.getArgument(0)));
        doAnswer(inv -> {
            redisStore.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(valueOperations).set(anyString(), anyString(), any(Duration.class));
        when(valueOperations.increment(anyString())).thenReturn(1L);
    }

    @Test
    void verifyAuthenticatedRequest_validSignature_attested() {
        long userId = 42L;
        String deviceId = "device-abc";
        String secret = "super-secret-key";
        storeDevice(userId, deviceId, secret);

        long ts = System.currentTimeMillis() / 1000;
        String nonce = "nonce-valid-001";
        String path = "/api/auth/me";
        String bodyHash = ClientAttestationService.sha256Hex(new byte[0]);
        String sig = ClientAttestationService.hmacSha256Hex(
                secret,
                ClientAttestationService.canonicalString("GET", path, ts, nonce, bodyHash));

        ClientAttestationService.VerifyResult result = service.verifyAuthenticatedRequest(
                userId,
                "GET",
                path,
                new byte[0],
                "electron/0.2.123/build123",
                deviceId,
                Long.toString(ts),
                nonce,
                sig);

        assertTrue(result.ok());
        assertTrue(result.attested());
    }

    @Test
    void verifyAuthenticatedRequest_replayNonce_rejected() {
        long userId = 7L;
        String deviceId = "device-replay";
        String secret = "replay-secret";
        storeDevice(userId, deviceId, secret);

        long ts = System.currentTimeMillis() / 1000;
        String nonce = "nonce-once-only";
        String path = "/api/characters";
        String bodyHash = ClientAttestationService.sha256Hex(new byte[0]);
        String sig = ClientAttestationService.hmacSha256Hex(
                secret,
                ClientAttestationService.canonicalString("GET", path, ts, nonce, bodyHash));
        String client = "electron/0.2.123/build123";

        assertTrue(service.verifyAuthenticatedRequest(
                        userId, "GET", path, new byte[0], client, deviceId,
                        Long.toString(ts), nonce, sig)
                .ok());
        assertFalse(service.verifyAuthenticatedRequest(
                        userId, "GET", path, new byte[0], client, deviceId,
                        Long.toString(ts), nonce, sig)
                .ok());
    }

    @Test
    void verifyAuthenticatedRequest_missingHeaders_rejected() {
        ClientAttestationService.VerifyResult result = service.verifyAuthenticatedRequest(
                1L, "GET", "/api/auth/me", new byte[0], null, null, null, null, null);
        assertFalse(result.ok());
    }

    @Test
    void verifyAuthenticatedRequest_staleTimestamp_rejected() {
        long userId = 3L;
        String deviceId = "device-stale";
        storeDevice(userId, deviceId, "secret-stale");

        long staleTs = System.currentTimeMillis() / 1000 - 10_000;
        ClientAttestationService.VerifyResult result = service.verifyAuthenticatedRequest(
                userId,
                "GET",
                "/api/auth/me",
                new byte[0],
                "electron/0.2.123/build123",
                deviceId,
                Long.toString(staleTs),
                "nonce-stale-001",
                "deadbeef");

        assertFalse(result.ok());
    }

    @Test
    void issueCredentials_validClientHeader_returnsDeviceSecret() {
        ClientAttestationService.DeviceCredentials creds = service.issueCredentials(
                99L, null, "electron/0.2.123/build123", "build123");
        assertNotNull(creds);
        assertNotNull(creds.deviceId());
        assertNotNull(creds.deviceSecret());
    }

    private void storeDevice(long userId, String deviceId, String secret) {
        try {
            String json = new ObjectMapper().writeValueAsString(
                    Map.of("userId", userId, "secret", secret));
            redisStore.put("client:attest:device:" + deviceId, json);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }
}
