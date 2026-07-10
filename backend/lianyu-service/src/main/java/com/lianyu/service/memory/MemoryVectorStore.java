package com.lianyu.service.memory;

import com.lianyu.dao.enums.MemoryType;
import java.util.List;

/**
 * Pluggable semantic-memory index. Implementations may use Milvus, pgvector,
 * Qdrant, or disable vector search entirely while retaining the SQL fallback.
 */
public interface MemoryVectorStore {

    record VectorHit(Long memoryId, String summary, float score) {
        public VectorHit(String summary, float score) {
            this(null, summary, score);
        }
    }

    String backendName();

    boolean isAvailable();

    String insert(Long characterId,
                  Long userId,
                  Long memoryId,
                  String summary,
                  MemoryType memoryType);

    void delete(List<String> vectorIds);

    List<VectorHit> search(Long characterId,
                           Long userId,
                           String query,
                           int topK,
                           float similarityThreshold);
}
