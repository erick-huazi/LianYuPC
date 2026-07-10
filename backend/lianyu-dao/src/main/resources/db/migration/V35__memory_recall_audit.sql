CREATE TABLE IF NOT EXISTS memory_recall_log (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    character_id  BIGINT NOT NULL,
    route         VARCHAR(32) NOT NULL COMMENT 'PROFILE / SEMANTIC / SEMANTIC_CACHE',
    backend       VARCHAR(32) NOT NULL COMMENT 'mysql / milvus / redis / none',
    query_hash    CHAR(64) DEFAULT NULL COMMENT 'SHA-256 only; raw query is never stored',
    hit_count     INT NOT NULL DEFAULT 0,
    memory_ids    JSON DEFAULT NULL,
    created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_recall_user_created (user_id, created_at),
    INDEX idx_recall_character_created (character_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
