package com.lianyu.service.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MomentFeedResponse {
    private List<MomentPostResponse> items;
    private Long nextCursor;
    private boolean hasMore;
}
