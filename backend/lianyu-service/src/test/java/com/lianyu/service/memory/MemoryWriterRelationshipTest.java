package com.lianyu.service.memory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.lianyu.dao.entity.MemoryMeta;
import com.lianyu.dao.entity.Message;
import com.lianyu.dao.enums.MemoryType;
import com.lianyu.dao.mapper.MemoryMetaMapper;
import com.lianyu.service.memory.MemoryCacheService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class MemoryWriterRelationshipTest {

    @Test
    void extractRelationshipMemories_marksNicknameAsRitual() {
        MemoryWriter writer = new MemoryWriter(
                null, Mockito.mock(MemoryMetaMapper.class), null, null, null, null);

        Message msg = new Message();
        msg.setId(101L);
        msg.setRole("USER");
        msg.setContent("以后你可以叫我阿昼，这是只给你叫的。");

        List<MemoryWriter.MemoryCandidate> candidates = writer.extractRelationshipMemories(List.of(msg));

        assertEquals(MemoryType.RITUAL, candidates.get(0).memoryType());
        assertTrue(candidates.get(0).summary().contains("专属称呼"));
    }

    @Test
    void retrieveProfileContext_includesRelationBlockBeforePromptReturn() {
        MemoryMetaMapper memoryMetaMapper = Mockito.mock(MemoryMetaMapper.class);
        MemoryCacheService memoryCacheService = Mockito.mock(MemoryCacheService.class);
        MemoryRetriever retriever = new MemoryRetriever(null, null, null, memoryMetaMapper, memoryCacheService);

        MemoryMeta fact = new MemoryMeta();
        fact.setSummary("【长期记忆/爱好】夜跑");
        fact.setMemoryType(MemoryType.FACT);

        MemoryMeta ritual = new MemoryMeta();
        ritual.setSummary("你们约定了晚安问候");
        ritual.setMemoryType(MemoryType.RITUAL);

        MemoryMeta relation = new MemoryMeta();
        relation.setSummary("上次因为敷衍回复让她有些受伤");
        relation.setMemoryType(MemoryType.RELATION);

        when(memoryMetaMapper.selectList(any())).thenReturn(List.of(fact, ritual, relation));

        String context = retriever.retrieveProfileContext(5L, 3L);

        assertTrue(context.contains("[关系事件]"));
        assertTrue(context.contains("[专属仪式]"));
    }
}