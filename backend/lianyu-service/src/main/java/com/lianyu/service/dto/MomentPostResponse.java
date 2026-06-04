package com.lianyu.service.dto;

import java.time.LocalDateTime;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MomentPostResponse {
    private Long id;
    private Long characterId;
    private String characterName;
    private String characterAvatarUrl;
    private Long conversationId;
    private String content;
    private String postType;
    private Map<String, Object> metaJson;
    private LocalDateTime createdAt;
}
