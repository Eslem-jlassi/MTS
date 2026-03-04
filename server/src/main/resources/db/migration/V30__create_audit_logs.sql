-- =============================================================================
-- V30: Audit Logs - Traçabilité complète des actions système
-- =============================================================================
-- Date: 2026-02-28
-- Auteur: Billcom Consulting
-- Description: Table audit_logs pour logger toutes les actions sensibles
--              (création/modification tickets, assignations, escalades,
--              modifications services/SLA, actions admin)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: audit_logs
-- -----------------------------------------------------------------------------
-- Stocke l'historique complet de toutes les actions effectuées dans le système.
-- Permet la traçabilité, le debugging, et la conformité (GDPR, ISO 27001).
-- Indexée pour performance sur les recherches par entity, user, date.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    -- Identifiant unique
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- Horodatage de l'action (NON NULL, indexé pour tri chronologique)
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Utilisateur qui a effectué l'action (peut être NULL pour actions système/auto)
    user_id BIGINT NULL,

    -- Type d'action effectuée (enum backend)
    action VARCHAR(100) NOT NULL,

    -- Type d'entité affectée (TICKET, SERVICE, CLIENT, USER, SLA_POLICY, etc.)
    entity_type VARCHAR(50) NOT NULL,

    -- ID de l'entité affectée (pour lien vers l'objet)
    entity_id BIGINT NOT NULL,

    -- Nom/Label de l'entité pour affichage (ex: "Ticket #123", "Service Fibre FTTH")
    entity_name VARCHAR(255) NULL,

    -- Description textuelle de l'action (pour affichage UI)
    description TEXT NOT NULL,

    -- Ancienne valeur (JSON ou texte simple, pour comparaison avant/après)
    old_value TEXT NULL,

    -- Nouvelle valeur (JSON ou texte simple)
    new_value TEXT NULL,

    -- Adresse IP de l'utilisateur (traçabilité sécurité)
    ip_address VARCHAR(45) NULL,

    -- User Agent du navigateur/client (pour debugging)
    user_agent VARCHAR(255) NULL,

    -- Metadata additionnelles (JSON, flexible pour extensions futures)
    metadata JSON NULL,

    -- Contrainte de clé étrangère vers users (ON DELETE SET NULL pour garder trace même si user supprimé)
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    -- Index pour performance
    INDEX idx_audit_timestamp (timestamp DESC),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity_timestamp (entity_type, entity_id, timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Commentaires de table (documentation intégrée MySQL)
-- -----------------------------------------------------------------------------

ALTER TABLE audit_logs COMMENT = 'Logs d''audit pour traçabilité complète des actions système';

-- -----------------------------------------------------------------------------
-- Index composite pour requêtes courantes
-- -----------------------------------------------------------------------------

-- Recherche des actions d'un utilisateur spécifique dans une période
CREATE INDEX idx_audit_user_timestamp ON audit_logs(user_id, timestamp DESC);

-- Recherche de toutes les actions sur une entité (ex: historique d'un ticket)
-- Note: idx_audit_entity_timestamp already covers entity_type+entity_id+timestamp
-- CREATE INDEX idx_audit_entity_composite ON audit_logs(entity_type, entity_id, timestamp DESC);

-- -----------------------------------------------------------------------------
-- Données de démonstration (optionnel - commentées par défaut)
-- -----------------------------------------------------------------------------

-- Exemples de logs audit pour documentation et tests
/*
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, description, old_value, new_value, ip_address)
VALUES
    -- Création ticket
    (2, 'TICKET_CREATED', 'TICKET', 1, 'Ticket #1', 'Ticket créé par Jean Dupont', NULL, '{"title":"Problème connexion internet","priority":"HIGH"}', '192.168.1.10'),

    -- Assignation ticket
    (3, 'TICKET_ASSIGNED', 'TICKET', 1, 'Ticket #1', 'Ticket assigné à Marie Martin', 'Assigné à: Aucun', 'Assigné à: Marie Martin', '192.168.1.11'),

    -- Changement statut
    (3, 'TICKET_STATUS_CHANGED', 'TICKET', 1, 'Ticket #1', 'Statut changé de OUVERT à EN_COURS', 'OUVERT', 'EN_COURS', '192.168.1.11'),

    -- Changement priorité
    (3, 'TICKET_PRIORITY_CHANGED', 'TICKET', 1, 'Ticket #1', 'Priorité changée de HAUTE à CRITIQUE', 'HIGH', 'CRITICAL', '192.168.1.11'),

    -- Escalade automatique
    (NULL, 'TICKET_ESCALATED', 'TICKET', 1, 'Ticket #1', 'Ticket escaladé automatiquement (SLA dépassé)', '{"level":0}', '{"level":1,"manager":"Pierre Durand"}', NULL),

    -- Modification service
    (1, 'SERVICE_UPDATED', 'SERVICE', 1, 'Service Fibre FTTH', 'Capacité bande passante modifiée', '{"bandwidth":"100Mbps"}', '{"bandwidth":"1Gbps"}', '192.168.1.1'),

    -- Création SLA policy
    (1, 'SLA_POLICY_CREATED', 'SLA_POLICY', 1, 'SLA Bronze', 'Nouvelle politique SLA créée', NULL, '{"responseTime":"4h","resolutionTime":"24h"}', '192.168.1.1'),

    -- Action admin : désactivation utilisateur
    (1, 'USER_DEACTIVATED', 'USER', 5, 'Jean Dupont', 'Utilisateur désactivé par l''administrateur', '{"active":true}', '{"active":false}', '192.168.1.1');
*/

-- =============================================================================
-- FIN MIGRATION V30
-- =============================================================================
