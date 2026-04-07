ALTER TABLE users
    ADD COLUMN sensitive_action_code_hash VARCHAR(255) NULL,
    ADD COLUMN sensitive_action_code_expiry DATETIME NULL;
