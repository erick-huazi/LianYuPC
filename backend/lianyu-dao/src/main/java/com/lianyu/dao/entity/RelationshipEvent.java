package com.lianyu.dao.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.lianyu.common.handler.JacksonTypeHandler;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;

@Data
@TableName(value = "relationship_event", autoResultMap = true)
public class RelationshipEvent {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long characterId;
    private Long conversationId;
    private Long messageId;
    private String eventType;
    private Integer eventWeight;
    private String summary;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> metadataJson;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
