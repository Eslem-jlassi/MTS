ALTER TABLE users
    ADD COLUMN email_verification_token_expiry TIMESTAMP NULL AFTER email_verification_token;
