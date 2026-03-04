-- =============================================================================
-- V10__fix_user_passwords.sql - Fix BCrypt password hashes
-- Password: "Password1!" encoded with BCrypt (cost 10)
-- =============================================================================
UPDATE users SET password = '$2a$10$3JQtMXoaJu0Nu425foCw2uJot3hcOC0ptIRSC2EyeZ3cfTo0S4tzS'
WHERE email IN ('admin@billcom.tn', 'manager@billcom.tn', 'agent1@billcom.tn', 'agent2@billcom.tn', 'client1@ericsson.tn', 'client2@ooredoo.tn');
