package com.lianyu.service.memory;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lianyu.dao.entity.MemoryRecallLog;
import com.lianyu.dao.mapper.MemoryRecallLogMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryRecallAuditService {

    private final MemoryRecallLogMapper recallLogMapper;

    @Value("${lianyu.memory.audit.enabled:true}")
    private boolean enabled;

    @Value("${lianyu.memory.audit.retention-days:30}")
    private int retentionDays;

    public void record(Long userId,
                       Long characterId,
                       String route,
                       String backend,
                       String query,
                       List<Long> memoryIds,
                       int hitCount) {
        if (!enabled || userId == null || characterId == null || hitCount <= 0) {
            return;
        }
        try {
            MemoryRecallLog event = new MemoryRecallLog();
            event.setUserId(userId);
            event.setCharacterId(characterId);
            event.setRoute(route);
            event.setBackend(backend == null || backend.isBlank() ? "none" : backend);
            event.setQueryHash(query == null || query.isBlank() ? null : sha256(query.trim()));
            event.setMemoryIds(memoryIds == null ? List.of() : memoryIds.stream().filter(id -> id != null).distinct().toList());
            event.setHitCount(hitCount);
            recallLogMapper.insert(event);
        } catch (Exception e) {
            log.warn("Memory recall audit write failed: {}", e.getMessage());
        }
    }

    public List<MemoryRecallLog> list(Long userId, Long characterId, int page, int size) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(100, Math.max(1, size));
        LambdaQueryWrapper<MemoryRecallLog> query = new LambdaQueryWrapper<MemoryRecallLog>()
                .eq(MemoryRecallLog::getUserId, userId)
                .orderByDesc(MemoryRecallLog::getCreatedAt)
                .last("LIMIT " + safeSize + " OFFSET " + ((safePage - 1) * safeSize));
        if (characterId != null) {
            query.eq(MemoryRecallLog::getCharacterId, characterId);
        }
        return recallLogMapper.selectList(query);
    }

    public void clear(Long userId, Long characterId) {
        LambdaQueryWrapper<MemoryRecallLog> query = new LambdaQueryWrapper<MemoryRecallLog>()
                .eq(MemoryRecallLog::getUserId, userId);
        if (characterId != null) {
            query.eq(MemoryRecallLog::getCharacterId, characterId);
        }
        recallLogMapper.delete(query);
    }

    @Scheduled(cron = "0 15 3 * * *")
    public void deleteExpired() {
        if (!enabled) {
            return;
        }
        recallLogMapper.delete(new LambdaQueryWrapper<MemoryRecallLog>()
                .lt(MemoryRecallLog::getCreatedAt, LocalDateTime.now().minusDays(Math.max(1, retentionDays))));
    }

    private String sha256(String value) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    }
}
