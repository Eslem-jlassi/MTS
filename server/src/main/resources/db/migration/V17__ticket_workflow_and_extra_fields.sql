-- =============================================================================
-- V17 - Workflow statuts (ASSIGNED, PENDING_THIRD_PARTY) + champs ticket
-- MTS Telecom - Phase 2 Ticketing Enterprise
-- =============================================================================

-- Nouveaux champs sur tickets (cause racine, solution détaillée, catégorie finale, temps passé, impact)
ALTER TABLE tickets ADD COLUMN root_cause TEXT NULL AFTER resolution;
ALTER TABLE tickets ADD COLUMN final_category VARCHAR(20) NULL AFTER root_cause;
ALTER TABLE tickets ADD COLUMN time_spent_minutes INT NULL AFTER final_category;
ALTER TABLE tickets ADD COLUMN impact VARCHAR(50) NULL AFTER time_spent_minutes;

-- Note: Les statuts ASSIGNED et PENDING_THIRD_PARTY sont des valeurs VARCHAR existantes (status),
-- pas de modification de schéma nécessaire pour l'enum côté BDD.
