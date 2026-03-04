-- =============================================================================
-- V29 - Amélioration Reports: Executive Summary, filtres avancés, CSV export
-- MTS Telecom - Billcom Consulting - PFE 2026
-- =============================================================================

-- 1. Ajout de colonnes à la table reports pour le résumé exécutif et l'export CSV
ALTER TABLE reports
    ADD COLUMN executive_summary TEXT AFTER description,
    ADD COLUMN format VARCHAR(10) NOT NULL DEFAULT 'PDF' AFTER mime_type,
    ADD COLUMN service_filter_id BIGINT NULL AFTER service_id,
    ADD COLUMN team_filter VARCHAR(200) NULL AFTER service_filter_id,
    ADD COLUMN client_filter_id BIGINT NULL AFTER team_filter,
    ADD COLUMN status_filter VARCHAR(50) NULL AFTER client_filter_id;

-- 2. Index sur le format pour les recherches
CREATE INDEX idx_report_format ON reports(format);
