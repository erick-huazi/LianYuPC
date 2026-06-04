package com.lianyu.service.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MessagePageResponse {
    private List<MessageResponse> records;
    private boolean hasMore;
    /** 若 hasMore，前端下次请求传此 seq（严格小于该值的更早消息） */
    private Long nextBeforeSeq;
}
