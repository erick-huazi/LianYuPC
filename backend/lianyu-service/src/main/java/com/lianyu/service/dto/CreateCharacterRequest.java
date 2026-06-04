package com.lianyu.service.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import lombok.Data;

@Data
public class CreateCharacterRequest {
    @NotBlank
    private String name;
    private String avatarUrl;
    private Map<String, Object> settings;
    private String promptTemplate;
}
