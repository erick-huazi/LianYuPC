package com.lianyu.service.character;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;


/**
 * 情绪衰减定时任务：每 15 分钟执行一次，让非平静情绪自然回落。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmotionDecayScheduler {

    private final CharacterStateService characterStateService;

    @Value("${lianyu.emotion.decay.enabled:true}")
    private boolean decayEnabled;

    @Scheduled(fixedDelayString = "${lianyu.emotion.decay.interval-ms:900000}")
    public void decayEmotions() {
        if (!decayEnabled) {
            return;
        }
        try {
            int count = characterStateService.decayAllEmotions();
            if (count > 0) {
                log.debug("Emotion decay: {} states updated", count);
            }
        } catch (Exception e) {
            log.warn("Emotion decay tick failed: {}", e.getMessage());
        }
    }
}
