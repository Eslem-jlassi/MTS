-- V31__add_oauth_provider_columns.sql
-- Ajoute le tracking du fournisseur OAuth (Google, etc.) sur la table users.
-- Backward-compatible : les comptes existants (email/password) ne sont pas affectés.

ALTER TABLE users
    ADD COLUMN oauth_provider    VARCHAR(20)  NULL COMMENT 'Fournisseur OAuth (GOOGLE, etc.)',
    ADD COLUMN oauth_provider_id VARCHAR(255) NULL COMMENT 'Identifiant unique chez le fournisseur (sub Google)';

-- Index composite pour lookup rapide par provider + providerId
CREATE INDEX idx_users_oauth_provider ON users (oauth_provider, oauth_provider_id);
