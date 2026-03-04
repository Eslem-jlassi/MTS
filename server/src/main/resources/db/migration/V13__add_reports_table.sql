-- =============================================================================
-- V13__add_reports_table.sql - Table rapports pour managers
-- MTS Telecom - Billcom Consulting - PFE 2026
-- =============================================================================
-- OBJECTIF:
-- Permettre aux managers d'uploader des rapports PDF et de les consulter.
-- Chaque rapport est lié à une période, un service (optionnel), et un auteur.
-- =============================================================================

-- =============================================
-- TABLE: reports - Rapports PDF uploadés
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    -- Métadonnées du rapport
    title VARCHAR(200) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
    -- Types: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, CUSTOM
    
    -- Période couverte par le rapport
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Fichier uploadé
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    
    -- Associations
    service_id BIGINT,
    created_by BIGINT NOT NULL,
    
    -- Métadonnées
    download_count INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_reports_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_reports_type (report_type),
    INDEX idx_reports_period (period_start, period_end),
    INDEX idx_reports_service (service_id),
    INDEX idx_reports_created_by (created_by),
    INDEX idx_reports_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
