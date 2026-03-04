-- =============================================================================
-- V19 - Table macros (templates / réponses rapides pour agents)
-- MTS Telecom - Phase 2
-- =============================================================================

CREATE TABLE macros (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    role_allowed VARCHAR(20) NULL COMMENT 'AGENT, MANAGER, ADMIN - NULL = tous les rôles staff',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE INDEX idx_macros_role ON macros(role_allowed);
