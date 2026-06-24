package com.lianyu.service.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class ClientAttestationServiceTest {

    @Test
    void hmacRoundTripMatchesCanonicalFormat() {
        String secret = "abc123";
        String bodyHash = ClientAttestationService.sha256Hex("{\"hello\":1}".getBytes());
        String canonical = ClientAttestationService.canonicalString(
                "POST", "/api/auth/me", 1_700_000_000L, "nonce123", bodyHash);
        String sig = ClientAttestationService.hmacSha256Hex(secret, canonical);
        assertEquals(64, sig.length());
        assertNotEquals(
                ClientAttestationService.hmacSha256Hex(secret, canonical + "x"),
                sig);
    }

    @Test
    void semverCompareWorks() {
        assertEquals(1, ClientAttestationService.compareSemver("0.2.123", "0.2.122"));
        assertEquals(0, ClientAttestationService.compareSemver("0.2.123", "0.2.123"));
        assertEquals(-1, ClientAttestationService.compareSemver("0.2.100", "0.2.123"));
    }
}
