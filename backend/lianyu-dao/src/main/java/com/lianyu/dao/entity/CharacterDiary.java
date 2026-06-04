package com.lianyu.dao.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName(value = "character_diary", autoResultMap = true)
public class CharacterDiary {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long characterId;
    private Long userId;
    private String title;
    private String content;
    private String mood;
    private Long conversationId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}