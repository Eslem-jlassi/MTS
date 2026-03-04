-- =============================================================================
-- V26 - Horaires ouvrés SLA + Pause/reprise SLA + Historique SLA
-- MTS Telecom - Phase 11 (SLA avancé)
-- =============================================================================

-- -------------------------------------------------------
-- 1. Table horaires ouvrés (configurable par Admin)
-- -------------------------------------------------------
CREATE TABLE business_hours (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL DEFAULT 'Horaires par défaut',
    start_hour  TINYINT      NOT NULL DEFAULT 8,      -- Heure début (0-23)
    end_hour    TINYINT      NOT NULL DEFAULT 18,      -- Heure fin (0-23)
    work_days   VARCHAR(30)  NOT NULL DEFAULT '1,2,3,4,5', -- Jours ouvrés (1=lundi..7=dimanche)
    timezone    VARCHAR(50)  NOT NULL DEFAULT 'Africa/Tunis',
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6)  NULL
);

-- Horaires par défaut : Lun-Ven 8h-18h
INSERT INTO business_hours (name, start_hour, end_hour, work_days, timezone, is_default, active)
VALUES ('Standard Billcom', 8, 18, '1,2,3,4,5', 'Africa/Tunis', TRUE, TRUE);

-- -------------------------------------------------------
-- 2. Lier sla_config aux business_hours (optionnel, NULL = 24/7)
-- -------------------------------------------------------
ALTER TABLE sla_config
    ADD COLUMN business_hours_id BIGINT NULL AFTER response_time_hours,
    ADD CONSTRAINT fk_sla_business_hours FOREIGN KEY (business_hours_id)
        REFERENCES business_hours(id) ON DELETE SET NULL;

-- -------------------------------------------------------
-- 3. Champs de pause SLA sur tickets
-- -------------------------------------------------------
ALTER TABLE tickets
    ADD COLUMN sla_paused_at DATETIME(6) NULL AFTER sla_warning_notified_at,
    ADD COLUMN sla_paused_minutes BIGINT NOT NULL DEFAULT 0 AFTER sla_paused_at,
    ADD COLUMN escalation_level INT NOT NULL DEFAULT 0 AFTER sla_paused_minutes;

-- -------------------------------------------------------
-- 4. Table historique SLA (traçabilité des changements)
-- -------------------------------------------------------
CREATE TABLE sla_timeline (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id       BIGINT       NOT NULL,
    event_type      VARCHAR(30)  NOT NULL,  -- STARTED, PAUSED, RESUMED, BREACHED, AT_RISK, ESCALATED, DEADLINE_CHANGED
    old_value       VARCHAR(255) NULL,
    new_value       VARCHAR(255) NULL,
    details         TEXT         NULL,
    paused_minutes  BIGINT       NULL,      -- Total minutes pausées au moment de l'event
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_sla_timeline_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE INDEX idx_sla_timeline_ticket ON sla_timeline(ticket_id);
CREATE INDEX idx_sla_timeline_type   ON sla_timeline(event_type);
