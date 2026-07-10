package com.lianyu.common.util;

import com.lianyu.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OutboundUrlValidatorTest {

    @Test
    void rejectsLoopbackByDefault() {
        assertThrows(BusinessException.class,
                () -> OutboundUrlValidator.validateAndNormalize("http://127.0.0.1:1234/v1", false));
    }

    @Test
    void allowsLoopbackWhenSelfHostedOptInIsEnabled() {
        assertEquals("http://127.0.0.1:1234/v1",
                OutboundUrlValidator.validateAndNormalize("http://127.0.0.1:1234/v1", false, true));
    }

    @Test
    void allowsOnlyTheExplicitLocalOllamaPortWithoutPrivateNetworkOptIn() {
        assertEquals("http://localhost:11434",
                OutboundUrlValidator.validateAndNormalize("http://localhost:11434", true));
        assertThrows(BusinessException.class,
                () -> OutboundUrlValidator.validateAndNormalize("http://localhost:1234/ollama", true));
    }

    @Test
    void neverAllowsMetadataOrWildcardAddresses() {
        assertThrows(BusinessException.class,
                () -> OutboundUrlValidator.validateAndNormalize("http://169.254.169.254/latest", false, true));
        assertThrows(BusinessException.class,
                () -> OutboundUrlValidator.validateAndNormalize("http://0.0.0.0:8000/v1", false, true));
    }
}
