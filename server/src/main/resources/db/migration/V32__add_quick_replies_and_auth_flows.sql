-- =============================================================================
-- V32 — Quick Reply Templates + Auth flows (password reset, email verify)
--       + Notification preferences (JSON)
-- MTS Telecom — Billcom Consulting PFE 2026
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Quick Reply Templates table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quick_reply_templates (
    id              BIGINT          AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    content         TEXT            NOT NULL,
    category        VARCHAR(30)     NOT NULL DEFAULT 'custom',
    variables       VARCHAR(500)    DEFAULT NULL COMMENT 'Comma-separated variable names, e.g. {client},{ticketId}',
    role_allowed    VARCHAR(20)     DEFAULT NULL COMMENT 'NULL = all roles',
    created_by_id   BIGINT          DEFAULT NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_qrt_category   (category),
    INDEX idx_qrt_role       (role_allowed),
    CONSTRAINT fk_qrt_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default quick reply templates
INSERT INTO quick_reply_templates (name, content, category, variables, role_allowed) VALUES
('Accusé de réception',
 'Bonjour {client},\n\nNous avons bien reçu votre demande (ticket {ticketId}) concernant le service {service}.\n\nNotre équipe technique va analyser votre demande dans les plus brefs délais.\n\nCordialement,\n{agent}',
 'accuse', '{client},{ticketId},{service},{agent}', NULL),

('Demande d''informations complémentaires',
 'Bonjour {client},\n\nAfin de traiter votre ticket {ticketId} dans les meilleurs délais, nous aurions besoin des informations suivantes :\n\n- [Préciser les informations nécessaires]\n\nMerci de nous les transmettre au plus vite.\n\nCordialement,\n{agent}',
 'info', '{client},{ticketId},{agent}', NULL),

('Résolution en cours',
 'Bonjour {client},\n\nNous vous informons que votre ticket {ticketId} est en cours de traitement par notre équipe.\n\nLe service {service} devrait être rétabli sous peu. Nous vous tiendrons informé de l''avancement.\n\nCordialement,\n{agent}',
 'resolution', '{client},{ticketId},{service},{agent}', NULL),

('Ticket résolu',
 'Bonjour {client},\n\nNous avons le plaisir de vous informer que votre ticket {ticketId} a été résolu.\n\nSi vous constatez un nouveau dysfonctionnement sur le service {service}, n''hésitez pas à nous recontacter.\n\nCordialement,\n{agent}',
 'cloture', '{client},{ticketId},{service},{agent}', NULL),

('Escalade technique',
 'Bonjour {client},\n\nVotre ticket {ticketId} a été escaladé à notre équipe technique de niveau supérieur pour une analyse approfondie.\n\nVous serez notifié dès que nous aurons un retour.\n\nCordialement,\n{agent}',
 'escalade', '{client},{ticketId},{agent}', 'AGENT'),

('Note interne — Diagnostic',
 '[NOTE INTERNE]\nTicket: {ticketId} | Service: {service}\nDate diagnostic: {date}\n\nRésultat :\n- [Décrire le diagnostic]\n\nProchaines étapes :\n- [Actions à mener]',
 'custom', '{ticketId},{service},{date}', 'AGENT');

-- ---------------------------------------------------------------------------
-- 2. Password reset and email verification fields on users
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN password_reset_token        VARCHAR(255) DEFAULT NULL AFTER oauth_provider_id,
    ADD COLUMN password_reset_token_expiry  TIMESTAMP    DEFAULT NULL AFTER password_reset_token,
    ADD COLUMN email_verified              BOOLEAN      DEFAULT TRUE AFTER password_reset_token_expiry,
    ADD COLUMN email_verification_token    VARCHAR(255) DEFAULT NULL AFTER email_verified;

CREATE INDEX idx_users_pwd_reset_token ON users (password_reset_token);
CREATE INDEX idx_users_email_verify_token ON users (email_verification_token);

-- ---------------------------------------------------------------------------
-- 3. Notification preferences (JSON column)
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN notification_preferences JSON DEFAULT NULL AFTER email_verification_token;
