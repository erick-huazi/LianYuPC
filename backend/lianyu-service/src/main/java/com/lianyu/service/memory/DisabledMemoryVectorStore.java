package com.lianyu.service.memory;

import com.lianyu.dao.enums.MemoryType;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** SQL-only mode: semantic search falls back to recent important memories. */
@Component
@ConditionalOnProperty(name = "lianyu.storage.milvus.enabled", havingValue = "false")
public class DisabledMemoryVectorStore implements MemoryVectorStore {

    @Override
    public String backendName() {
        return "none";
    }

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public String insert(Long characterId, Long userId, Long memoryId, String summary, MemoryType memoryType) {
        return null;
    }

    @Override
    public void delete(List<String> vectorIds) {
        // No external index in SQL-only mode.
    }

    @Override
    public List<VectorHit> search(Long characterId, Long userId, String query, int topK, float similarityThreshold) {
        return List.of();
    }
}
