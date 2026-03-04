-- =============================================================================
-- V22__report_source_and_generated.sql - Rapports générés + source
-- MTS Telecom - Billcom Consulting - PFE 2026 - Phase 5
-- =============================================================================
-- Ajoute la notion de rapport uploadé vs généré (hebdo/mensuel basé tickets/incidents).
-- =============================================================================

ALTER TABLE reports
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'UPLOADED'
  COMMENT 'UPLOADED = PDF uploadé, GENERATED = généré par le système'
  AFTER is_published;

CREATE INDEX idx_reports_source ON reports(source);
