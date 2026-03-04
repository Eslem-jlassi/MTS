-- =============================================
-- V8: Add missing ip_address column to chatbot_logs
-- =============================================
ALTER TABLE chatbot_logs ADD COLUMN ip_address VARCHAR(45) NULL AFTER created_ticket_id;
