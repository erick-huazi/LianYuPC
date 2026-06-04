package com.lianyu.service.dto;

import java.util.List;
import lombok.Data;




@Data
public class MarkNotificationReadRequest {
    private Boolean all;
    private Long conversationId;
    private List<Long> ids;
}
