package com.lianyu.service.dto;

import lombok.Data;

@Data
public class AddCharacterFromSquareRequest {

    /** real | fictional — 现实城市由用户填写，虚构城市由模型推断 */
    private String cityMode = "real";

    /** 用户所在城市（cityMode=real 时必填，写入 settings.city） */
    private String city;
}
