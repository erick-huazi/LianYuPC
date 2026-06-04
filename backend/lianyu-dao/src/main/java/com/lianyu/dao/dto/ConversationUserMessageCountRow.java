package com.lianyu.dao.dto;

import lombok.Data;

@Data
public class ConversationUserMessageCountRow {
    private Long conversationId;
    private Long total;
}
