package com.lianyu.dao.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.lianyu.common.handler.JacksonListTypeHandler;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
@TableName(value = "memory_recall_log", autoResultMap = true)
public class MemoryRecallLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long characterId;
    private String route;
    private String backend;
    private String queryHash;
    private Integer hitCount;
    @TableField(typeHandler = JacksonListTypeHandler.class)
    private List<Long> memoryIds;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
