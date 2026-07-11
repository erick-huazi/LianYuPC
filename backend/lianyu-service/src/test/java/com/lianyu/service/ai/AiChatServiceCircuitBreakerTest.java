package com.lianyu.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lianyu.common.base.ErrorCode;
import com.lianyu.common.exception.BusinessException;
import com.lianyu.service.dto.AiChatRequest;
import com.lianyu.service.rules.PromptRuleEngine;
import com.lianyu.service.storage.FileStorageService;
import com.lianyu.service.support.OutputLanguageService;
import com.lianyu.service.tools.ToolManager;
import io.github.resilience4j.bulkhead.BulkheadRegistry;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import java.util.concurrent.ScheduledExecutorService;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AiChatServiceCircuitBreakerTest {

    @Test
    void vaultConfigurationFailureDoesNotEnterCircuitBreaker() {
        ApiKeyVaultService vaultService = mock(ApiKeyVaultService.class);
        BulkheadRegistry bulkheadRegistry = mock(BulkheadRegistry.class);
        TimeLimiterRegistry timeLimiterRegistry = mock(TimeLimiterRegistry.class);
        CircuitBreakerRegistry circuitBreakerRegistry = mock(CircuitBreakerRegistry.class);
        CircuitBreaker circuitBreaker = mock(CircuitBreaker.class);

        when(bulkheadRegistry.bulkhead("ai-chat"))
                .thenReturn(mock(io.github.resilience4j.bulkhead.Bulkhead.class));
        when(timeLimiterRegistry.timeLimiter("ai-chat"))
                .thenReturn(mock(io.github.resilience4j.timelimiter.TimeLimiter.class));
        when(circuitBreakerRegistry.circuitBreaker("ai-chat")).thenReturn(circuitBreaker);

        BusinessException configurationError = new BusinessException(
                ErrorCode.AI_PROVIDER_ERROR, "vault key cannot be decrypted");
        when(vaultService.resolveForChat(7L, "platform")).thenThrow(configurationError);

        AiChatService service = new AiChatService(
                vaultService,
                mock(FileStorageService.class),
                mock(ToolManager.class),
                mock(StringRedisTemplate.class),
                new ObjectMapper(),
                bulkheadRegistry,
                timeLimiterRegistry,
                circuitBreakerRegistry,
                mock(ScheduledExecutorService.class),
                mock(PromptRuleEngine.class),
                mock(OutputLanguageService.class));
        AiChatRequest request = new AiChatRequest();
        request.setProvider("platform");

        BusinessException thrown = assertThrows(
                BusinessException.class, () -> service.chatBlocking(7L, request));

        assertSame(configurationError, thrown);
        verifyNoInteractions(circuitBreaker);
    }
}
