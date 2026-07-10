package com.lianyu.web.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lianyu.common.base.Result;
import com.lianyu.dao.entity.Character;
import com.lianyu.dao.entity.Conversation;
import com.lianyu.dao.entity.MemoryMeta;
import com.lianyu.dao.entity.MemoryRecallLog;
import com.lianyu.dao.entity.Message;
import com.lianyu.dao.mapper.CharacterMapper;
import com.lianyu.dao.mapper.ConversationMapper;
import com.lianyu.dao.mapper.MemoryMetaMapper;
import com.lianyu.dao.mapper.MessageMapper;
import com.lianyu.service.memory.MemoryCacheService;
import com.lianyu.service.memory.MemoryWriter;
import com.lianyu.service.memory.MemoryRecallAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Tag(name = "Memory", description = "记忆管理")
@RestController
@RequestMapping("/api/memory")
@RequiredArgsConstructor
public class MemoryController {

    private static final int MAX_LIST_SIZE = 200;

    private final MemoryMetaMapper memoryMetaMapper;
    private final MessageMapper messageMapper;
    private final CharacterMapper characterMapper;
    private final ConversationMapper conversationMapper;
    private final MemoryWriter memoryWriter;
    private final MemoryCacheService memoryCacheService;
    private final MemoryRecallAuditService memoryRecallAuditService;

    @Operation(summary = "记忆列表（按角色分组）")
    @GetMapping
    public Result<List<Map<String, Object>>> list(
            @RequestParam(required = false) Long characterId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size) {
        long userId = StpUtil.getLoginIdAsLong();
        int safeSize = Math.min(MAX_LIST_SIZE, Math.max(1, size));
        int safePage = Math.max(1, page);
        int offset = (safePage - 1) * safeSize;

        LambdaQueryWrapper<MemoryMeta> q = new LambdaQueryWrapper<MemoryMeta>()
                .eq(MemoryMeta::getUserId, userId)
                .orderByDesc(MemoryMeta::getCreatedAt);
        if (characterId != null) {
            q.eq(MemoryMeta::getCharacterId, characterId);
        }
        q.last("LIMIT " + safeSize + " OFFSET " + offset);

        List<MemoryMeta> metas = memoryMetaMapper.selectList(q);
        Set<Long> characterIds = metas.stream()
                .map(MemoryMeta::getCharacterId)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toSet());
        Map<Long, Character> characterMap = characterIds.isEmpty()
                ? Map.of()
                : characterMapper.selectBatchIds(characterIds).stream()
                        .collect(Collectors.toMap(Character::getId, c -> c, (a, b) -> a));

        var result = metas.stream().map(m -> {
            Character character = characterMap.get(m.getCharacterId());
            Map<String, Object> m1 = new LinkedHashMap<>();
            m1.put("id", m.getId());
            m1.put("characterId", m.getCharacterId());
            m1.put("characterName", character != null ? character.getName() : "角色#" + m.getCharacterId());
            m1.put("summary", m.getSummary());
            m1.put("importance", m.getImportance());
            m1.put("sourceMsgIds", m.getSourceMsgIds());
            m1.put("createdAt", m.getCreatedAt());
            return m1;
        }).toList();

        return Result.ok(result);
    }

    @Operation(summary = "获取记忆详情（含来源消息）")
    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Long id) {
        long userId = StpUtil.getLoginIdAsLong();

        MemoryMeta meta = memoryMetaMapper.selectOne(
                new LambdaQueryWrapper<MemoryMeta>()
                        .eq(MemoryMeta::getId, id)
                        .eq(MemoryMeta::getUserId, userId));
        if (meta == null) {
            return Result.fail(404, "记忆不存在");
        }

        List<Message> sourceMsgs = List.of();
        if (meta.getSourceMsgIds() != null && !meta.getSourceMsgIds().isEmpty()) {
            sourceMsgs = messageMapper.selectBatchIds(meta.getSourceMsgIds());
            sourceMsgs = filterMessagesOwnedByUser(userId, sourceMsgs);
        }
        Character character = characterMapper.selectById(meta.getCharacterId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", meta.getId());
        result.put("characterId", meta.getCharacterId());
        result.put("characterName", character != null ? character.getName() : "角色#" + meta.getCharacterId());
        result.put("summary", meta.getSummary());
        result.put("sourceMsgIds", meta.getSourceMsgIds());
        result.put("createdAt", meta.getCreatedAt());
        result.put("sourceMessages", sourceMsgs.stream().map(msg -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", msg.getId());
            m.put("role", msg.getRole());
            m.put("content", msg.getContent());
            m.put("createdAt", msg.getCreatedAt());
            return m;
        }).toList());

        return Result.ok(result);
    }

    @Operation(summary = "最近记忆命中记录（不保存原始查询）")
    @GetMapping("/recalls")
    public Result<List<Map<String, Object>>> listRecalls(
            @RequestParam(required = false) Long characterId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int size) {
        long userId = StpUtil.getLoginIdAsLong();
        List<MemoryRecallLog> logs = memoryRecallAuditService.list(userId, characterId, page, size);
        Set<Long> memoryIds = logs.stream()
                .flatMap(log -> log.getMemoryIds() == null ? java.util.stream.Stream.empty() : log.getMemoryIds().stream())
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<Long, String> summaries = memoryIds.isEmpty()
                ? Map.of()
                : memoryMetaMapper.selectList(new LambdaQueryWrapper<MemoryMeta>()
                        .in(MemoryMeta::getId, memoryIds)
                        .eq(MemoryMeta::getUserId, userId)).stream()
                        .filter(memory -> memory.getSummary() != null)
                        .collect(Collectors.toMap(MemoryMeta::getId, MemoryMeta::getSummary, (a, b) -> a));
        return Result.ok(logs.stream().map(log -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", log.getId());
            row.put("characterId", log.getCharacterId());
            row.put("route", log.getRoute());
            row.put("backend", log.getBackend());
            row.put("hitCount", log.getHitCount());
            row.put("memoryIds", log.getMemoryIds());
            row.put("summaries", log.getMemoryIds() == null ? List.of() : log.getMemoryIds().stream()
                    .map(summaries::get)
                    .filter(summary -> summary != null && !summary.isBlank())
                    .toList());
            row.put("createdAt", log.getCreatedAt());
            return row;
        }).toList());
    }

    @Operation(summary = "清空记忆命中记录")
    @DeleteMapping("/recalls")
    public Result<Void> clearRecalls(@RequestParam(required = false) Long characterId) {
        long userId = StpUtil.getLoginIdAsLong();
        memoryRecallAuditService.clear(userId, characterId);
        return Result.ok();
    }

    @Operation(summary = "删除记忆")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        long userId = StpUtil.getLoginIdAsLong();

        MemoryMeta meta = memoryMetaMapper.selectOne(
                new LambdaQueryWrapper<MemoryMeta>()
                        .eq(MemoryMeta::getId, id)
                        .eq(MemoryMeta::getUserId, userId));
        if (meta == null) {
            return Result.fail(404, "记忆不存在");
        }

        memoryWriter.deleteVectors(meta.getMilvusVecId() == null ? List.of() : List.of(meta.getMilvusVecId()));
        memoryMetaMapper.deleteById(id);
        memoryCacheService.invalidate(userId, meta.getCharacterId());
        return Result.ok();
    }

    @Operation(summary = "清空当前用户的全部记忆或指定角色记忆")
    @DeleteMapping
    public Result<Map<String, Object>> clear(@RequestParam(required = false) Long characterId) {
        long userId = StpUtil.getLoginIdAsLong();
        LambdaQueryWrapper<MemoryMeta> query = new LambdaQueryWrapper<MemoryMeta>()
                .eq(MemoryMeta::getUserId, userId);
        if (characterId != null) {
            query.eq(MemoryMeta::getCharacterId, characterId);
        }
        List<MemoryMeta> memories = memoryMetaMapper.selectList(query);
        memoryWriter.deleteVectors(memories.stream()
                .map(MemoryMeta::getMilvusVecId)
                .filter(id -> id != null && !id.isBlank())
                .toList());
        memoryMetaMapper.delete(query);
        memories.stream()
                .map(MemoryMeta::getCharacterId)
                .filter(id -> id != null)
                .distinct()
                .forEach(id -> memoryCacheService.invalidate(userId, id));
        memoryRecallAuditService.clear(userId, characterId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("deleted", memories.size());
        result.put("characterId", characterId);
        return Result.ok(result);
    }

    private List<Message> filterMessagesOwnedByUser(long userId, List<Message> messages) {
        if (messages == null || messages.isEmpty()) {
            return List.of();
        }
        Set<Long> conversationIds = messages.stream()
                .map(Message::getConversationId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        if (conversationIds.isEmpty()) {
            return List.of();
        }
        List<Conversation> owned = conversationMapper.selectList(new LambdaQueryWrapper<Conversation>()
                .in(Conversation::getId, conversationIds)
                .eq(Conversation::getUserId, userId));
        Set<Long> ownedIds = owned.stream().map(Conversation::getId).collect(Collectors.toSet());
        return messages.stream()
                .filter(m -> m.getConversationId() != null && ownedIds.contains(m.getConversationId()))
                .toList();
    }
}
