-- =============================================================================
-- V15__add_is_read_to_notifications.sql - Ajout colonne is_read si manquante
-- MTS Telecom - Billcom Consulting - PFE 2026
-- =============================================================================
-- OBJECTIF:
-- La table notifications peut exister sans la colonne is_read si elle a été
-- créée avant V14 (ex: CREATE TABLE IF NOT EXISTS a été ignoré).
-- On ajoute is_read uniquement si elle n'existe pas.
-- =============================================================================

-- Procédure temporaire pour ajouter is_read seulement si la colonne est absente
DELIMITER //
CREATE PROCEDURE add_is_read_to_notifications_if_missing()
BEGIN
    IF (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'notifications'
          AND COLUMN_NAME = 'is_read') = 0 THEN
        ALTER TABLE notifications
        ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE AFTER reference_id;
        ALTER TABLE notifications
        ADD INDEX idx_notifications_is_read (is_read);
    END IF;
END //
DELIMITER ;

CALL add_is_read_to_notifications_if_missing();
DROP PROCEDURE add_is_read_to_notifications_if_missing;
