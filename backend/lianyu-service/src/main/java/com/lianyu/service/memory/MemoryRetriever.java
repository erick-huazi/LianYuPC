package com.lianyu.service.memory;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lianyu.dao.entity.MemoryMeta;
import com.lianyu.dao.mapper.MemoryMetaMapper;
import com.lianyu.service.ai.EmbeddingService;
import com.lianyu.service.ai.RerankerService;
import cn.hutool.core.util.StrUtil;
import com.lianyu.storage.milvus.MilvusConfig;
import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.SearchResultData;
import io.milvus.param.dml.SearchParam;
import io.milvus.param.MetricType;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryRetriever {

    private final EmbeddingService embeddingService;
    private final RerankerService rerankerService;
    private final MilvusServiceClient milvusClient;
    private final MemoryMetaMapper memoryMetaMapper;
    private final MemoryCacheService memoryCacheService;

    public static final int DEFAULT_TOOL_TOP_K = 5;

    private static final int SEARCH_CANDIDATE_COUNT = 20;
    private static final float SIMILARITY_THRESHOLD = 0.3f;

    /**
     * 结构化长期记忆（姓名/爱好等），发消息前预注入 system prompt。
     */
    public String retrieveProfileContext(Long characterId, Long userId) {
        List<String> facts = loadProfileFacts(characterId, userId);
        if (facts.isEmpty()) {
            return null;
        }
        return String.join("\n", facts);
    }

    /**
     * Agentic 语义检索：由 memory_search Tool 调用，不走寒暄过滤。
     */
    public List<String> searchSemantic(Long characterId, Long userId, String query, int topK) {
        if (StrUtil.isBlank(query)) {
            return List.of();
        }
        int k = topK > 0 ? topK : DEFAULT_TOOL_TOP_K;
        return retrieveSemantic(characterId, userId, query.trim(), k);
    }

    /**
     * 结构化长期记忆（姓名/爱好等），在涉及用户身份或爱好的问句时加载。
     */
    private List<String> loadProfileFacts(Long characterId, Long userId) {
        List<String> cached = memoryCacheService.getProfileFacts(userId, characterId);
        if (cached != null) {
            return cached;
        }

        List<MemoryMeta> metas = memoryMetaMapper.selectList(
                new LambdaQueryWrapper<MemoryMeta>()
                        .eq(MemoryMeta::getCharacterId, characterId)
                        .eq(MemoryMeta::getUserId, userId)
                        .likeRight(MemoryMeta::getSummary, "【长期记忆/")
                        .orderByDesc(MemoryMeta::getCreatedAt));

        Map<String, String> latestBySlot = new LinkedHashMap<>();
        for (MemoryMeta meta : metas) {
            if (meta.getSummary() == null || meta.getSummary().isBlank()) {
                continue;
            }
            String slot = extractProfileSlot(meta.getSummary());
            if (slot != null && !latestBySlot.containsKey(slot)) {
                latestBySlot.put(slot, "- " + meta.getSummary());
            }
        }
        List<String> facts = new ArrayList<>(latestBySlot.values());
        memoryCacheService.putProfileFacts(userId, characterId, facts);
        return facts;
    }

    private String extractProfileSlot(String summary) {
        if (!summary.startsWith("【长期记忆/")) {
            return null;
        }
        int end = summary.indexOf('】');
        if (end <= "【长期记忆/".length()) {
            return null;
        }
        return summary.substring("【长期记忆/".length(), end);
    }

    private List<String> retrieveSemantic(Long characterId, Long userId, String query, int topK) {
        try {
            List<String> cached = memoryCacheService.getSemanticResults(userId, characterId, query);
            if (cached != null) {
                return cached.size() > topK ? cached.subList(0, topK) : cached;
            }

            List<MemoryMeta> candidates = new ArrayList<>();

            // Try vector search first
            try {
                float[] vec = embeddingService.embed(query, userId);

                List<Float> queryVector = new ArrayList<>(vec.length);
                for (float f : vec) {
                    queryVector.add(f);
                }

                SearchParam searchParam = SearchParam.newBuilder()
                        .withCollectionName(MilvusConfig.COLLECTION_MEMORY_VECTORS)
                        .withVectorFieldName("vector")
                        .withVectors(List.of(queryVector))
                        .withOutFields(List.of("character_id", "user_id"))
                        .withTopK(Math.max(SEARCH_CANDIDATE_COUNT, topK * 3))
                        .withMetricType(MetricType.COSINE)
                        .withExpr("character_id == " + characterId + " && user_id == " + userId)
                        .build();

                var searchResult = milvusClient.search(searchParam);
                if (searchResult.getData() == null) {
                    log.warn("Vector search returned null data, status={}", searchResult.getStatus());
                    throw new RuntimeException("Vector search returned null");
                }
                SearchResultData resultData = searchResult.getData().getResults();

                if (resultData.getIds().getIntId().getDataCount() > 0) {
                    List<Long> vecIds = new ArrayList<>();
                    for (int i = 0; i < resultData.getIds().getIntId().getDataCount(); i++) {
                        long vecId = resultData.getIds().getIntId().getData(i);
                        float score = resultData.getScores(i);
                        if (score >= SIMILARITY_THRESHOLD) {
                            vecIds.add(vecId);
                        }
                    }

                    if (!vecIds.isEmpty()) {
                        for (Long vecId : vecIds) {
                            MemoryMeta meta = memoryMetaMapper.selectOne(
                                    new LambdaQueryWrapper<MemoryMeta>()
                                            .eq(MemoryMeta::getMilvusVecId, String.valueOf(vecId))
                                            .eq(MemoryMeta::getCharacterId, characterId)
                                            .eq(MemoryMeta::getUserId, userId)
                                            .last("LIMIT 1"));
                            if (meta != null && meta.getSummary() != null) {
                                candidates.add(meta);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Vector search unavailable, falling back to recent memories: {}", e.getMessage());
            }

            // Fallback: also fetch recent memories without vectors
            if (candidates.isEmpty()) {
                candidates.addAll(loadRecentMemoryMetas(characterId, userId));
            }

            if (candidates.isEmpty()) {
                return List.of();
            }

            // Rerank with query
            List<String> docTexts = candidates.stream()
                    .map(m -> m.getSummary() != null ? m.getSummary() : "")
                    .toList();

            List<RerankerService.ScoredDoc> reranked;
            try {
                reranked = rerankerService.rerank(query, docTexts, userId);
            } catch (Exception e) {
                log.warn("Rerank failed, using original order: {}", e.getMessage());
                reranked = new ArrayList<>();
                for (int i = 0; i < docTexts.size(); i++) {
                    reranked.add(new RerankerService.ScoredDoc(i, docTexts.get(i), 0.5f));
                }
            }

            List<String> summaries = reranked.stream()
                    .limit(topK)
                    .map(d -> "- " + d.text())
                    .toList();

            log.info("Memory retrieved: {} results for query ({} chars)", summaries.size(), query.length());
            memoryCacheService.putSemanticResults(userId, characterId, query, summaries);
            return summaries;
        } catch (Exception e) {
            log.error("Memory retrieval failed", e);
            return List.of();
        }
    }

    private List<MemoryMeta> loadRecentMemoryMetas(Long characterId, Long userId) {
        List<String> cachedSummaries = memoryCacheService.getRecentSummaries(userId, characterId);
        if (cachedSummaries != null && !cachedSummaries.isEmpty()) {
            return cachedSummaries.stream()
                    .map(summary -> {
                        MemoryMeta meta = new MemoryMeta();
                        meta.setSummary(summary.startsWith("- ") ? summary.substring(2) : summary);
                        return meta;
                    })
                    .toList();
        }

        List<MemoryMeta> fallback = memoryMetaMapper.selectList(
                new LambdaQueryWrapper<MemoryMeta>()
                        .eq(MemoryMeta::getCharacterId, characterId)
                        .eq(MemoryMeta::getUserId, userId)
                        .orderByDesc(MemoryMeta::getCreatedAt)
                        .last("LIMIT " + SEARCH_CANDIDATE_COUNT));

        List<String> summaryLines = fallback.stream()
                .map(m -> m.getSummary() != null ? m.getSummary() : "")
                .filter(s -> !s.isBlank())
                .toList();
        memoryCacheService.putRecentSummaries(userId, characterId, summaryLines);
        return fallback;
    }
}
