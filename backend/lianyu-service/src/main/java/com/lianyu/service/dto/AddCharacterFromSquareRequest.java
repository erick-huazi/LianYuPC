package com.lianyu.service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddCharacterFromSquareRequest {

    /** 用户所在城市，用于主动问候与天气/时间工具（写入 settings.city） */
    @NotBlank(message = "请填写所在城市")
    private String city;
}
