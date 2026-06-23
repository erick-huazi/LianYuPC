package com.lianyu.service.character;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lianyu.dao.entity.CharacterDiary;
import com.lianyu.dao.mapper.CharacterDiaryMapper;
import com.lianyu.dao.mapper.CharacterMapper;
import com.lianyu.dao.mapper.MomentsCommentMapper;
import com.lianyu.dao.mapper.MomentsPostMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class CharacterRecentActivityServiceTest {

    private CharacterDiaryMapper characterDiaryMapper;
    private MomentsPostMapper momentsPostMapper;
    private MomentsCommentMapper momentsCommentMapper;
    private CharacterMapper characterMapper;
    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOps;
    private CharacterRecentActivityService service;

    @BeforeEach
    void setUp() {
        characterDiaryMapper = mock(CharacterDiaryMapper.class);
        momentsPostMapper = mock(MomentsPostMapper.class);
        momentsCommentMapper = mock(MomentsCommentMapper.class);
        characterMapper = mock(CharacterMapper.class);
        redisTemplate = mock(StringRedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        service = new CharacterRecentActivityService(
                characterDiaryMapper,
                momentsPostMapper,
                momentsCommentMapper,
                characterMapper,
                redisTemplate);
    }

    @Test
    void formatForPrompt_emptyDataReturnsEmptyString() {
        when(valueOps.get(any())).thenReturn(null);
        when(characterDiaryMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());
        when(momentsPostMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());
        when(momentsCommentMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        assertEquals("", service.formatForPrompt(1L, 2L, "zh"));
    }

    @Test
    void formatForPrompt_includesDiaryLine() {
        when(valueOps.get(any())).thenReturn(null);
        CharacterDiary diary = new CharacterDiary();
        diary.setCreatedAt(LocalDateTime.of(2026, 6, 22, 10, 0));
        diary.setTitle("雨夜");
        diary.setContent("今天想了很多关于未来的事情，写下来当作提醒。");
        when(characterDiaryMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(diary));
        when(momentsPostMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());
        when(momentsCommentMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        String block = service.formatForPrompt(1L, 2L, "zh");

        assertTrue(block.contains("=== 你最近的生活动态"));
        assertTrue(block.contains("写了日记"));
        assertTrue(block.contains("雨夜"));
    }

    @Test
    void evictCache_deletesRedisKey() {
        service.evictCache(5L, 6L);
        verify(redisTemplate).delete("activity:prompt:5:6");
    }
}
