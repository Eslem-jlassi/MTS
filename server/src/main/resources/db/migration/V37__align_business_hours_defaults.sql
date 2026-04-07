-- =============================================================================
-- V37__align_business_hours_defaults.sql
-- Sprint 1: timezone and baseline defaults coherence for business hours
-- =============================================================================

-- Keep DB defaults aligned with runtime configuration.
ALTER TABLE business_hours
    MODIFY COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Paris';

-- Normalize existing rows that may still use old timezone values.
UPDATE business_hours
SET timezone = 'Europe/Paris'
WHERE timezone IN ('Africa/Tunis', 'Africa/Casablanca');

-- Keep default profile naming coherent in admin screens.
UPDATE business_hours
SET name = 'Standard MTS Telecom'
WHERE is_default = TRUE
  AND name IN ('Standard Billcom', 'Horaires par défaut', 'Horaires par defaut');
