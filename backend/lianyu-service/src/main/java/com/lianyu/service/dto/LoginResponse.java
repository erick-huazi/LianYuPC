package com.lianyu.service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String token;
    private String tokenName;
    private Long userId;
    private String username;
    private String nickname;
    private String avatarUrl;
    /** Electron client attestation — only returned on login/register with valid X-LianYu-Client. */
    private String deviceId;
    private String deviceSecret;
}
