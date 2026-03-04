-- =============================================================================
-- V27 - Règles d'escalade automatique (configurable par Admin)
-- MTS Telecom - Phase 11 (Escalade)
-- =============================================================================

CREATE TABLE escalation_rule (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    name               VARCHAR(150)  NOT NULL,
    description        TEXT          NULL,
    trigger_type       VARCHAR(30)   NOT NULL,  -- AT_RISK, BREACHED
    threshold_percent  INT           NULL,      -- Ex: 80 = 80% du SLA consommé (pour AT_RISK)
    escalation_level   INT           NOT NULL DEFAULT 1,
    auto_assign_to     BIGINT        NULL,      -- User ID à assigner (optionnel)
    notify_roles       VARCHAR(100)  NULL,      -- Rôles à notifier séparés par virgule: "MANAGER,ADMIN"
    change_priority    VARCHAR(20)   NULL,      -- Nouvelle priorité (optionnel)
    enabled            BOOLEAN       NOT NULL DEFAULT TRUE,
    priority_filter    VARCHAR(20)   NULL,      -- Applicable seulement à cette priorité (NULL = toutes)
    sort_order         INT           NOT NULL DEFAULT 0,
    created_at         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at         DATETIME(6)   NULL,
    CONSTRAINT fk_escalation_auto_assign FOREIGN KEY (auto_assign_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Règles par défaut
INSERT INTO escalation_rule (name, trigger_type, threshold_percent, escalation_level, notify_roles, enabled, sort_order)
VALUES
    ('SLA à risque → Niveau 1', 'AT_RISK', 80, 1, 'MANAGER', TRUE, 1),
    ('SLA dépassé → Niveau 2 + Notifier managers', 'BREACHED', 100, 2, 'MANAGER,ADMIN', TRUE, 2);

-- Index
CREATE INDEX idx_escalation_trigger ON escalation_rule(trigger_type, enabled);
