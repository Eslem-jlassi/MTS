-- =============================================================================
-- V28 : Incidents crédibles + Services enrichis + Health Monitoring
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Services : nouveaux champs (owner, criticality, sla_policy_id)
-- ---------------------------------------------------------------------------
ALTER TABLE services
    ADD COLUMN owner_id BIGINT NULL AFTER company_id,
    ADD COLUMN criticality VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' AFTER owner_id,
    ADD COLUMN sla_policy_id BIGINT NULL AFTER criticality,
    ADD CONSTRAINT fk_service_owner FOREIGN KEY (owner_id) REFERENCES users(id),
    ADD CONSTRAINT fk_service_sla_policy FOREIGN KEY (sla_policy_id) REFERENCES sla_config(id);

-- ---------------------------------------------------------------------------
-- 2. Service status history (sparkline / timeline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_status_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_id      BIGINT       NOT NULL,
    old_status      VARCHAR(20)  NOT NULL,
    new_status      VARCHAR(20)  NOT NULL,
    changed_by      BIGINT       NULL,
    reason          TEXT         NULL,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ssh_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT fk_ssh_user    FOREIGN KEY (changed_by)  REFERENCES users(id),
    INDEX idx_ssh_service_date (service_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 3. Incidents : enrichir le modèle (impact, description, post-mortem, commander)
-- ---------------------------------------------------------------------------
ALTER TABLE incidents
    ADD COLUMN description      TEXT         NULL AFTER title,
    ADD COLUMN impact            VARCHAR(30)  NOT NULL DEFAULT 'LOCALIZED' AFTER severity,
    ADD COLUMN incident_number   VARCHAR(30)  NULL AFTER id,
    ADD COLUMN commander_id      BIGINT       NULL AFTER cause,
    ADD COLUMN post_mortem       TEXT         NULL AFTER commander_id,
    ADD COLUMN post_mortem_at    DATETIME(6)  NULL AFTER post_mortem,
    ADD CONSTRAINT fk_incident_commander FOREIGN KEY (commander_id) REFERENCES users(id);

-- Incident number unique + generate for existing rows
UPDATE incidents SET incident_number = CONCAT('INC-', LPAD(id, 5, '0')) WHERE incident_number IS NULL;
ALTER TABLE incidents MODIFY incident_number VARCHAR(30) NOT NULL;
ALTER TABLE incidents ADD UNIQUE INDEX idx_incident_number (incident_number);

-- ---------------------------------------------------------------------------
-- 4. Incident Timeline (notes, updates, post-mortem entries)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incident_timeline (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id     BIGINT       NOT NULL,
    event_type      VARCHAR(30)  NOT NULL,  -- STATUS_CHANGE, NOTE, UPDATE, POST_MORTEM, TICKET_LINKED, TICKET_UNLINKED, SERVICE_ADDED, SERVICE_REMOVED
    content         TEXT         NULL,
    old_value       VARCHAR(100) NULL,
    new_value       VARCHAR(100) NULL,
    author_id       BIGINT       NULL,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_it_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    CONSTRAINT fk_it_author   FOREIGN KEY (author_id)   REFERENCES users(id),
    INDEX idx_it_incident_date (incident_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 5. Incident <-> Tickets (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incident_tickets (
    incident_id BIGINT NOT NULL,
    ticket_id   BIGINT NOT NULL,
    linked_at   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (incident_id, ticket_id),
    CONSTRAINT fk_it2_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    CONSTRAINT fk_it2_ticket   FOREIGN KEY (ticket_id)   REFERENCES tickets(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 6. Incident <-> Services affectés (many-to-many, en plus du service principal)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incident_services (
    incident_id BIGINT NOT NULL,
    service_id  BIGINT NOT NULL,
    PRIMARY KEY (incident_id, service_id),
    CONSTRAINT fk_is_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    CONSTRAINT fk_is_service  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
