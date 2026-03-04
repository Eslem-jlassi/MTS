-- =============================================================================
-- V21 - Incidents, KPI services, topologie (dépendances service → service)
-- MTS Telecom - Phase 4
-- =============================================================================

-- Table incidents (lié au service, optionnellement à un ticket parent)
CREATE TABLE incidents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    service_id BIGINT NOT NULL,
    ticket_id BIGINT NULL,
    started_at DATETIME(6) NOT NULL,
    resolved_at DATETIME(6) NULL,
    cause TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_incident_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    CONSTRAINT fk_incident_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
    INDEX idx_incident_service (service_id),
    INDEX idx_incident_status (status),
    INDEX idx_incident_started (started_at)
);

-- KPI sur services (dispo, latence, MTTR - valeurs agrégées ou simulées)
ALTER TABLE services ADD COLUMN availability_pct DECIMAL(5,2) NULL AFTER status;
ALTER TABLE services ADD COLUMN avg_latency_ms INT NULL AFTER availability_pct;
ALTER TABLE services ADD COLUMN mttr_minutes INT NULL AFTER avg_latency_ms;

-- Dépendances entre services (topologie)
CREATE TABLE service_dependency (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT NOT NULL,
    child_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_dependency (parent_id, child_id),
    CONSTRAINT chk_no_self CHECK (parent_id != child_id),
    CONSTRAINT fk_dep_parent FOREIGN KEY (parent_id) REFERENCES services(id) ON DELETE CASCADE,
    CONSTRAINT fk_dep_child FOREIGN KEY (child_id) REFERENCES services(id) ON DELETE CASCADE,
    INDEX idx_dep_parent (parent_id),
    INDEX idx_dep_child (child_id)
);
