-- =============================================
-- V9: Add missing sent_at column to messages table
-- =============================================

-- Entity Message uses sent_at but V1 migration created created_at
ALTER TABLE messages ADD COLUMN sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_read;

-- Copy existing created_at values into sent_at
UPDATE messages SET sent_at = created_at;
