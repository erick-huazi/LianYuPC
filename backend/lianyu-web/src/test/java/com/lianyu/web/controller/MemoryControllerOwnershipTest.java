package com.lianyu.web.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lianyu.common.base.Result;
import com.lianyu.dao.entity.Conversation;
import com.lianyu.dao.entity.MemoryMeta;
import com.lianyu.dao.entity.Message;
import com.lianyu.dao.mapper.CharacterMapper;
import com.lianyu.dao.mapper.ConversationMapper;
import com.lianyu.dao.mapper.MemoryMetaMapper;
import com.lianyu.dao.mapper.MessageMapper;
import com.lianyu.service.memory.MemoryCacheService;
import com.lianyu.service.memory.MemoryRecallAuditService;
import com.lianyu.service.memory.MemoryWriter;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

class MemoryControllerOwnershipTest {

    @Test
    void detail_filtersSourceMessagesFromAnotherUsersConversation() {
        Dependencies deps = new Dependencies();
        MemoryMeta memory = memory(41L, 9L, List.of(101L, 102L));
        when(deps.memoryMetaMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(memory);

        Message ownedMessage = message(101L, 201L, "owned");
        Message foreignMessage = message(102L, 202L, "foreign");
        when(deps.messageMapper.selectBatchIds(List.of(101L, 102L)))
                .thenReturn(List.of(ownedMessage, foreignMessage));

        Conversation ownedConversation = new Conversation();
        ownedConversation.setId(201L);
        ownedConversation.setUserId(3L);
        when(deps.conversationMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(List.of(ownedConversation));

        try (MockedStatic<StpUtil> stp = loggedInAs(3L)) {
            Result<Map<String, Object>> response = deps.controller.detail(41L);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> sourceMessages =
                    (List<Map<String, Object>>) response.getData().get("sourceMessages");
            assertEquals(1, sourceMessages.size());
            assertEquals(101L, sourceMessages.get(0).get("id"));
            assertEquals("owned", sourceMessages.get(0).get("content"));
        }
    }

    @Test
    void delete_doesNotMutateAnythingWhenMemoryIsNotOwned() {
        Dependencies deps = new Dependencies();
        when(deps.memoryMetaMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        try (MockedStatic<StpUtil> stp = loggedInAs(3L)) {
            Result<Void> response = deps.controller.delete(99L);

            assertEquals(404, response.getCode());
            verifyNoInteractions(deps.memoryWriter, deps.memoryCacheService);
        }
    }

    @Test
    void delete_removesVectorRowAndCacheForOwnedMemory() {
        Dependencies deps = new Dependencies();
        MemoryMeta memory = memory(41L, 9L, List.of());
        memory.setMilvusVecId("vec-41");
        when(deps.memoryMetaMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(memory);

        try (MockedStatic<StpUtil> stp = loggedInAs(3L)) {
            Result<Void> response = deps.controller.delete(41L);

            assertEquals(200, response.getCode());
            verify(deps.memoryWriter).deleteVectors(List.of("vec-41"));
            verify(deps.memoryMetaMapper).deleteById(41L);
            verify(deps.memoryCacheService).invalidate(3L, 9L);
        }
    }

    private static MockedStatic<StpUtil> loggedInAs(long userId) {
        MockedStatic<StpUtil> stp = mockStatic(StpUtil.class);
        stp.when(StpUtil::getLoginIdAsLong).thenReturn(userId);
        return stp;
    }

    private static MemoryMeta memory(long id, long characterId, List<Long> sourceMessageIds) {
        MemoryMeta memory = new MemoryMeta();
        memory.setId(id);
        memory.setUserId(3L);
        memory.setCharacterId(characterId);
        memory.setSummary("summary");
        memory.setSourceMsgIds(sourceMessageIds);
        return memory;
    }

    private static Message message(long id, long conversationId, String content) {
        Message message = new Message();
        message.setId(id);
        message.setConversationId(conversationId);
        message.setRole("user");
        message.setContent(content);
        return message;
    }

    private static final class Dependencies {
        private final MemoryMetaMapper memoryMetaMapper = mock(MemoryMetaMapper.class);
        private final MessageMapper messageMapper = mock(MessageMapper.class);
        private final CharacterMapper characterMapper = mock(CharacterMapper.class);
        private final ConversationMapper conversationMapper = mock(ConversationMapper.class);
        private final MemoryWriter memoryWriter = mock(MemoryWriter.class);
        private final MemoryCacheService memoryCacheService = mock(MemoryCacheService.class);
        private final MemoryRecallAuditService memoryRecallAuditService = mock(MemoryRecallAuditService.class);
        private final MemoryController controller = new MemoryController(
                memoryMetaMapper,
                messageMapper,
                characterMapper,
                conversationMapper,
                memoryWriter,
                memoryCacheService,
                memoryRecallAuditService);
    }
}
