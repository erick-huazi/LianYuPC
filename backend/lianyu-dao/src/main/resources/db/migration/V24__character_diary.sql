-- V24__character_diary.sql — 角色日记/内心独白
CREATE TABLE IF NOT EXISTS character_diary (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    character_id        BIGINT NOT NULL,
    user_id             BIGINT NOT NULL,
    title               VARCHAR(256) NOT NULL COMMENT '日记标题',
    content             TEXT NOT NULL COMMENT '日记正文',
    mood                VARCHAR(32) DEFAULT NULL COMMENT '写日记时的情绪',
    conversation_id     BIGINT DEFAULT NULL COMMENT '关联的对话ID',
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_char_user (character_id, user_id),
    INDEX idx_created (character_id, user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;