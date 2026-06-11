package com.lianyu.web.controller;

import com.lianyu.common.base.Result;
import com.lianyu.service.ai.AiChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/desktop")
@Tag(name = "桌面感知", description = "桌面截图分析 + 桌宠主动问候")
public class ObserveController {

    private final AiChatService aiChatService;

    public ObserveController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @PostMapping("/observe")
    @Operation(summary = "桌面感知观察", description = "传入桌面截图、窗口信息与角色人设，返回角色语气的主动问候")
    public Result<Map<String, String>> observe(@RequestBody Map<String, Object> body) {
        String imageBase64 = (String) body.get("imageBase64");
        String windowTitle = (String) body.get("windowTitle");
        String persona = (String) body.get("persona");

        if (imageBase64 == null || imageBase64.isBlank()) {
            return Result.fail(400, "缺少截图数据");
        }

        try {
            String greeting = aiChatService.observeDesktop(imageBase64, windowTitle, persona);
            if (greeting == null || greeting.isBlank()) {
                return Result.fail(500, "未能生成问候语");
            }
            return Result.ok(Map.of("greeting", greeting));
        } catch (Exception e) {
            log.error("Desktop observe failed", e);
            return Result.fail(500, "桌面感知服务繁忙，请稍后再试");
        }
    }
}
