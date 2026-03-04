-- =============================================================================
-- V33 - Indexes complémentaires pour les performances
-- =============================================================================
-- Ajout conditionnel d'indexes (vérifie l'existence avant de créer).
-- Compatible avec toutes les versions de MySQL 8.0.
-- =============================================================================

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

-- Tickets : recherche par service
CALL add_index_if_missing('tickets', 'idx_tickets_service_id',
     'CREATE INDEX idx_tickets_service_id ON tickets (service_id)');

-- Tickets : tri par SLA deadline
CALL add_index_if_missing('tickets', 'idx_tickets_sla_deadline',
     'CREATE INDEX idx_tickets_sla_deadline ON tickets (deadline)');

-- Tickets : recherche par numéro
CALL add_index_if_missing('tickets', 'idx_tickets_number_unique',
     'CREATE INDEX idx_tickets_number_unique ON tickets (ticket_number)');

-- Incidents : tri chronologique
CALL add_index_if_missing('incidents', 'idx_incidents_created_at',
     'CREATE INDEX idx_incidents_created_at ON incidents (created_at DESC)');

-- Audit logs : recherche par utilisateur + date
CALL add_index_if_missing('audit_logs', 'idx_audit_logs_user_timestamp',
     'CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs (user_id, timestamp DESC)');

-- Notifications : non lues par utilisateur
CALL add_index_if_missing('notifications', 'idx_notifications_user_unread',
     'CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC)');

-- Nettoyage
DROP PROCEDURE IF EXISTS add_index_if_missing;
