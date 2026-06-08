CREATE TABLE IF NOT EXISTS relationship_state (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    character_id BIGINT NOT NULL,
    trust_score INT NOT NULL DEFAULT 40,
    intimacy_score INT NOT NULL DEFAULT 20,
    security_score INT NOT NULL DEFAULT 40,
    anticipation_score INT NOT NULL DEFAULT 25,
    phase VARCHAR(32) NOT NULL DEFAULT 'TESTING',
    last_injury_at DATETIME(3) DEFAULT NULL,
    last_repair_at DATETIME(3) DEFAULT NULL,
    last_proactive_at DATETIME(3) DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_relationship_user_character (user_id, character_id),
    INDEX idx_relationship_character_user (character_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS relationship_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    character_id BIGINT NOT NULL,
    conversation_id BIGINT DEFAULT NULL,
    message_id BIGINT DEFAULT NULL,
    event_type VARCHAR(64) NOT NULL,
    event_weight INT NOT NULL DEFAULT 1,
    summary VARCHAR(255) DEFAULT NULL,
    metadata_json JSON DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_relationship_event_user_character_created (user_id, character_id, created_at),
    INDEX idx_relationship_event_conversation_created (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE memory_meta
    ADD COLUMN IF NOT EXISTS memory_type VARCHAR(32) NOT NULL DEFAULT 'FACT' AFTER summary;
