package com.lianyu.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.Valid;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    @Valid
    private CaptchaVerifyRequest captcha;
    /** Reuse existing device credentials on re-login (Electron). */
    private String deviceId;
    /** Must match X-LianYu-Client build segment when issuing credentials. */
    private String clientBuildId;
}
