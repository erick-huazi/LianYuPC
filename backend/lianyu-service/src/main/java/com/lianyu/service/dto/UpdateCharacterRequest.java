package com.lianyu.service.dto;

import java.util.Map;
import lombok.Data;

@Data
public class UpdateCharacterRequest {
    private String name;
    private String avatarUrl;
    private Map<String, Object> settings;
    private String promptTemplate;
}
