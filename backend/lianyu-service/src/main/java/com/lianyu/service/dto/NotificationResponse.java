package com.lianyu.service.dto;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;




@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String type;
    private Long conversationId;
    private Long characterId;
    private String title;
    private String contentPreview;
    private Boolean read;
    private LocalDateTime createdAt;
}
