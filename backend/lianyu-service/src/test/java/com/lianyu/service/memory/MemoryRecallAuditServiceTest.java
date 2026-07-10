package com.lianyu.service.memory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.lianyu.dao.entity.MemoryRecallLog;
import com.lianyu.dao.mapper.MemoryRecallLogMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class MemoryRecallAuditServiceTest {

    @Test
    void recordStoresOnlyAHashOfTheQuery() {
        MemoryRecallLogMapper mapper = mock(MemoryRecallLogMapper.class);
        MemoryRecallAuditService service = new MemoryRecallAuditService(mapper);
        ReflectionTestUtils.setField(service, "enabled", true);

        String query = "我最近工作压力很大";
        service.record(1L, 2L, "SEMANTIC", "mysql", query, List.of(9L, 9L, 10L), 2);

        ArgumentCaptor<MemoryRecallLog> captor = ArgumentCaptor.forClass(MemoryRecallLog.class);
        verify(mapper).insert(captor.capture());
        MemoryRecallLog event = captor.getValue();

        assertNotNull(event.getQueryHash());
        assertEquals(64, event.getQueryHash().length());
        assertFalse(event.getQueryHash().contains(query));
        assertEquals(List.of(9L, 10L), event.getMemoryIds());
        assertEquals(2, event.getHitCount());
    }
}
