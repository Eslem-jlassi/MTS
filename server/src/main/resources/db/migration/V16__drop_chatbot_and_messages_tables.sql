-- =============================================================================
-- V16 - Suppression des tables chatbot et messages (non utilisées)
-- MTS Telecom - Pas de microservice chatbot dans le périmètre PFE
-- =============================================================================
-- Ces tables ne sont plus utilisées par l'application.
-- Pour une base déjà migrée : exécution normale.
-- Pour une nouvelle base : après V1, ces tables sont créées puis supprimées ici.
-- =============================================================================

DROP TABLE IF EXISTS chatbot_logs;
DROP TABLE IF EXISTS messages;
