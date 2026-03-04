-- =============================================================================
-- V25 - Améliorations SLA Policies + index audit récent
-- MTS Telecom - Phase 10 (Admin Dashboard)
-- =============================================================================

-- -------------------------------------------------------
-- 1. Enrichir sla_config → SLA Policies (nom, description, temps réponse, actif)
-- -------------------------------------------------------
ALTER TABLE sla_config
  ADD COLUMN name VARCHAR(100) NULL AFTER id,
  ADD COLUMN description TEXT NULL AFTER name,
  ADD COLUMN response_time_hours INT NULL AFTER sla_hours,
  ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE AFTER response_time_hours,
  ADD COLUMN updated_at DATETIME(6) NULL AFTER created_at;

-- Remplir les noms par défaut pour les entrées existantes
UPDATE sla_config SET name = 'Critique - Mission Critical',   response_time_hours = 1,  description = 'Incidents critiques affectant la production'       WHERE priority = 'CRITICAL' AND service_id IS NULL;
UPDATE sla_config SET name = 'Haute priorité - Business Impact', response_time_hours = 2,  description = 'Problèmes affectant plusieurs utilisateurs'       WHERE priority = 'HIGH'     AND service_id IS NULL;
UPDATE sla_config SET name = 'Standard - Normal Support',     response_time_hours = 4,  description = 'Support standard pour incidents isolés'            WHERE priority = 'MEDIUM'   AND service_id IS NULL;
UPDATE sla_config SET name = 'Basse priorité - Best Effort',  response_time_hours = 8,  description = 'Demandes non-urgentes et améliorations'            WHERE priority = 'LOW'      AND service_id IS NULL;

-- Rendre name NOT NULL après remplissage
ALTER TABLE sla_config MODIFY COLUMN name VARCHAR(100) NOT NULL;

-- -------------------------------------------------------
-- 2. Index pour la requête "audit logs récents" (dashboard Admin)
-- -------------------------------------------------------
-- L'index idx_audit_created existe déjà (V23/V24), mais on s'assure
-- qu'il couvre bien le tri DESC pour getRecent()
-- (pas d'action si l'index existe déjà)
