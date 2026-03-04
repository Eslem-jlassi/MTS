-- =============================================================================
-- V12__add_service_status_column.sql - Ajout statut service (UP/DEGRADED/DOWN)
-- MTS Telecom - Billcom Consulting - PFE 2026
-- =============================================================================
-- OBJECTIF:
-- Ajouter une colonne `status` aux services pour indiquer leur état opérationnel.
-- Ceci permet aux admins de signaler les pannes et de déclencher des notifications.
-- =============================================================================

-- =============================================
-- ALTER TABLE: services - Ajout colonne status
-- =============================================
ALTER TABLE services
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'UP' AFTER is_active;

-- Index pour filtrer rapidement les services par status
ALTER TABLE services
ADD INDEX idx_services_status (status);

-- Mise à jour des services existants: tous UP par défaut
UPDATE services SET status = 'UP' WHERE status IS NULL OR status = '';
