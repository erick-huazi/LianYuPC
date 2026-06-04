package com.lianyu.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 验证码校验请求（随登录/注册一起提交）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaptchaVerifyRequest {
    @NotBlank(message = "验证码ID不能为空")
    private String captchaId;
    @NotNull(message = "验证码答案不能为空")
    private Integer captchaAnswer;
}
