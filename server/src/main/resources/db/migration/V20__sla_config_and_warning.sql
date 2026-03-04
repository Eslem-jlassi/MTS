-- =============================================================================
-- V20 - SLA configurable par priorité/service + suivi alerte à risque
-- MTS Telecom - Phase 3
-- =============================================================================

-- Table de configuration SLA (override par priorité et optionnellement par service)
CREATE TABLE sla_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    priority VARCHAR(20) NOT NULL,
    service_id BIGINT NULL,
    sla_hours INT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_sla_priority_service (priority, service_id),
    CONSTRAINT fk_sla_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Colonne pour éviter de spammer les notifications "à risque" (on notifie au plus une fois par période)
ALTER TABLE tickets ADD COLUMN sla_warning_notified_at DATETIME(6) NULL AFTER breached_sla;

-- Données par défaut (priorité seule, service_id = NULL = défaut global)
INSERT INTO sla_config (priority, service_id, sla_hours) VALUES
('CRITICAL', NULL, 4),
('HIGH', NULL, 8),
('MEDIUM', NULL, 24),
('LOW', NULL, 72);
