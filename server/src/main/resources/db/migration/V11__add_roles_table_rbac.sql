-- =============================================================================
-- V11__add_roles_table_rbac.sql - Migration vers RBAC avec table roles
-- MTS Telecom - Billcom Consulting - PFE 2026
-- =============================================================================
-- OBJECTIF:
-- Migrer de l'architecture "role enum dans users" vers une architecture RBAC
-- professionnelle avec table roles indépendante + table de liaison user_roles.
-- =============================================================================

-- =============================================
-- TABLE: roles - Rôles du système
-- =============================================
-- Cette table stocke les rôles disponibles dans l'application.
-- Chaque rôle a un code unique (ex: ROLE_ADMIN) et un nom lisible.
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_roles_code UNIQUE (code),
    INDEX idx_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLE: user_roles - Association N-N users <-> roles
-- =============================================
-- Un utilisateur peut avoir plusieurs rôles (ex: AGENT + MANAGER).
-- En pratique dans MTS, chaque user aura un seul rôle principal.
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by BIGINT,
    
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
    INDEX idx_user_roles_user (user_id),
    INDEX idx_user_roles_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INSERTION DES RÔLES PAR DÉFAUT
-- =============================================
INSERT INTO roles (code, name, description) VALUES
('ROLE_ADMIN', 'Administrateur', 'Accès complet: gestion utilisateurs, clients, services, dashboard global'),
('ROLE_MANAGER', 'Manager', 'Supervision équipe: statistiques, rapports, gestion tickets'),
('ROLE_AGENT', 'Agent Support', 'Traitement tickets: réponses, changements statut, notes internes'),
('ROLE_CLIENT', 'Client', 'Création tickets, suivi, consultation services');

-- =============================================
-- MIGRATION DES DONNÉES: users.role -> user_roles
-- =============================================
-- On copie l'attribution actuelle de chaque user vers la nouvelle table.
-- Le champ users.role (VARCHAR) contient 'ADMIN', 'MANAGER', 'AGENT', 'CLIENT'.
-- On le mappe vers le code 'ROLE_ADMIN', 'ROLE_MANAGER', etc.

INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT 
    u.id AS user_id,
    r.id AS role_id,
    u.created_at AS assigned_at
FROM users u
JOIN roles r ON r.code = CONCAT('ROLE_', u.role);

-- =============================================
-- NOTE: On ne supprime PAS la colonne users.role pour l'instant.
-- Cela permet une transition en douceur. Le backend utilisera
-- la nouvelle table user_roles. La colonne users.role sera
-- supprimée dans une future migration après validation.
-- =============================================
