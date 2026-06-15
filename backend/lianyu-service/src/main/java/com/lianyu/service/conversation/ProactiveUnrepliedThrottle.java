package com.lianyu.service.conversation;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 定时主动聊天：连续主动 N 次用户未回复则暂停，用户回复后清零。
 */
@Component
@RequiredArgsConstructor
public class ProactiveUnrepliedThrottle {

    static final String KEY_PREFIX = "chat:proactive:unreplied:";
    static final int MAX_UNREPLIED = 5;

    private final StringRedisTemplate redisTemplate;

    public boolean isPaused(Long conversationId) {
        if (conversationId == null) {
            return false;
        }
        String raw = redisTemplate.opsForValue().get(key(conversationId));
        if (raw == null || raw.isBlank()) {
            return false;
        }
        try {
            return Integer.parseInt(raw.trim()) >= MAX_UNREPLIED;
        } catch (NumberFormatException e) {
            redisTemplate.delete(key(conversationId));
            return false;
        }
    }

    public void recordProactiveSent(Long conversationId) {
        if (conversationId == null) {
            return;
        }
        redisTemplate.opsForValue().increment(key(conversationId));
    }

    public void resetOnUserReply(Long conversationId) {
        if (conversationId == null) {
            return;
        }
        redisTemplate.delete(key(conversationId));
    }

    private static String key(Long conversationId) {
        return KEY_PREFIX + conversationId;
    }
}
