-- V23__character_state.sql — 角色情绪与状态
CREATE TABLE IF NOT EXISTS character_state (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    character_id        BIGINT NOT NULL,
    user_id             BIGINT NOT NULL,
    current_emotion     VARCHAR(32) NOT NULL DEFAULT '平静' COMMENT '当前情绪：开心/难过/想念/吃醋/生气/撒娇/疲惫/兴奋/平静/担心',
    emotion_intensity   INT NOT NULL DEFAULT 50 COMMENT '情绪强度 0-100',
    status_text         VARCHAR(256) DEFAULT NULL COMMENT '简短状态签名，如"刚加班回来，好累…"',
    previous_emotion    VARCHAR(32) DEFAULT NULL,
    emotion_updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_char_user (character_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;