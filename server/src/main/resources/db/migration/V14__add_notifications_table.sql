-- =============================================================================
-- V14__add_notifications_table.sql - Table notifications temps réel
-- MTS Telecom - Billcom Consulting - PFE 2026
-- =============================================================================
-- OBJECTIF:
-- Stocker les notifications système pour chaque utilisateur.
-- Utilisé en combinaison avec WebSocket pour le temps réel.
-- =============================================================================

-- =============================================
-- TABLE: notifications - Notifications utilisateurs
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    -- Destinataire de la notification
    user_id BIGINT NOT NULL,
    
    -- Contenu
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    -- Types: INFO, WARNING, ERROR, SUCCESS, TICKET_CREATED, TICKET_ASSIGNED,
    --        TICKET_STATUS, TICKET_COMMENT, SLA_WARNING, SLA_BREACH, SERVICE_DOWN
    
    -- Référence vers l'objet concerné (optionnel)
    reference_type VARCHAR(50),
    -- Types: TICKET, SERVICE, USER, REPORT
    reference_id BIGINT,
    
    -- États
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    -- Métadonnées
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_type (notification_type),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created_at (created_at),
    INDEX idx_notifications_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INDEX COMPOSITE: Pour récupérer rapidement les non-lues d'un user
-- =============================================
ALTER TABLE notifications
ADD INDEX idx_notifications_user_unread (user_id, is_read, created_at DESC);
