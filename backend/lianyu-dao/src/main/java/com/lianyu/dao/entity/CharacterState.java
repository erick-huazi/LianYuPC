package com.lianyu.dao.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName(value = "character_state", autoResultMap = true)
public class CharacterState {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long characterId;
    private Long userId;
    private String currentEmotion;
    private Integer emotionIntensity;
    private String statusText;
    private String previousEmotion;
    private LocalDateTime emotionUpdatedAt;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}