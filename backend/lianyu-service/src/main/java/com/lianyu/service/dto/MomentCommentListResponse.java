package com.lianyu.service.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MomentCommentListResponse {
    private List<MomentCommentResponse> items;
    private Long nextCursor;
    private boolean hasMore;
    private int totalCount;
}
