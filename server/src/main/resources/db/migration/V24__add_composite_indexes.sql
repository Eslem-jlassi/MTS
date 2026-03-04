-- ============================================================================
-- V24: Composite indexes for common filter/sort queries
-- Compatible MySQL 8.0 — création conditionnelle via procédure temporaire
-- ============================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS add_index_if_missing//

CREATE PROCEDURE add_index_if_missing(
    IN p_table VARCHAR(64),
    IN p_index VARCHAR(64),
    IN p_sql   TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name   = p_table
          AND index_name   = p_index
        LIMIT 1
    ) THEN
        SET @ddl = p_sql;
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

-- Tickets : status + priority (dashboard)
CALL add_index_if_missing('tickets', 'idx_tickets_status_priority',
     'CREATE INDEX idx_tickets_status_priority ON tickets (status, priority)');

-- Tickets : status + created_at (tri chronologique)
CALL add_index_if_missing('tickets', 'idx_tickets_status_created',
     'CREATE INDEX idx_tickets_status_created ON tickets (status, created_at DESC)');

-- Tickets : assigned_to + status (charge agent)
CALL add_index_if_missing('tickets', 'idx_tickets_assigned_status',
     'CREATE INDEX idx_tickets_assigned_status ON tickets (assigned_to, status)');

-- Refresh tokens : user + revoked + expires_at (tokens actifs)
CALL add_index_if_missing('refresh_tokens', 'idx_refresh_tokens_user_active',
     'CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens (user_id, revoked, expires_at)');

-- Nettoyage
DROP PROCEDURE IF EXISTS add_index_if_missing;
