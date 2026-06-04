package com.lianyu.service.tools;

import com.lianyu.dao.entity.Character;
import com.lianyu.service.dto.AiChatRequest;
import java.util.Map;

/**
 * 单次 AI 请求内绑定角色与用户，供 {@link MemorySearchTool}、{@link WeatherTool} 等使用。
 */
public final class ChatToolContext {

    private static final ThreadLocal<Scope> CURRENT = new ThreadLocal<>();

    private ChatToolContext() {
    }

    public record Scope(Long userId, Long characterId, Map<String, Object> characterSettings) {
    }

    public static void set(Long userId, Long characterId, Map<String, Object> characterSettings) {
        if (userId == null || characterId == null) {
            clear();
            return;
        }
        CURRENT.set(new Scope(userId, characterId, characterSettings));
    }

    public static Scope current() {
        return CURRENT.get();
    }

    public static Scope require() {
        Scope scope = CURRENT.get();
        if (scope == null) {
            throw new IllegalStateException("Chat tool scope not set for this request");
        }
        return scope;
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static void bindTo(AiChatRequest request, Character character) {
        if (request == null || character == null || character.getId() == null) {
            return;
        }
        request.setChatToolCharacterId(character.getId());
        request.setToolCharacterSettings(character.getSettings());
    }
}
