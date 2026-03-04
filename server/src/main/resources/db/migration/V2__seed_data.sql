-- =============================================================================
-- V2__seed_data.sql - Données initiales pour démonstration Billcom
-- Billcom Consulting - PFE 2026
-- =============================================================================
-- Mots de passe: tous "Password1!" (BCrypt hash)
-- =============================================================================

-- =============================================
-- UTILISATEURS DE DÉMONSTRATION
-- =============================================
-- BCrypt hash pour "Password1!" (coût 10)
INSERT INTO users (email, password, first_name, last_name, role, phone, is_active) VALUES
('admin@billcom.tn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sami', 'Ben Ali', 'ADMIN', '+216 71 000 001', TRUE),
('manager@billcom.tn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Fatma', 'Trabelsi', 'MANAGER', '+216 71 000 002', TRUE),
('agent1@billcom.tn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ahmed', 'Khelifi', 'AGENT', '+216 71 000 003', TRUE),
('agent2@billcom.tn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Nour', 'Hammami', 'AGENT', '+216 71 000 004', TRUE),
('client1@ericsson.tn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Mohamed', 'Bouazizi', 'CLIENT', '+216 71 000 005', TRUE),
('client2@ooredoo.tn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Leila', 'Cherif', 'CLIENT', '+216 71 000 006', TRUE);

-- =============================================
-- PROFILS CLIENTS (liés aux users CLIENT)
-- =============================================
INSERT INTO clients (user_id, client_code, company_name, address) VALUES
((SELECT id FROM users WHERE email = 'client1@ericsson.tn'), 'CLI-2026-00001', 'Ericsson Tunisia', 'Centre Urbain Nord, Tunis 1082'),
((SELECT id FROM users WHERE email = 'client2@ooredoo.tn'), 'CLI-2026-00002', 'Ooredoo Tunisie', 'Rue du Lac Windermere, Les Berges du Lac, Tunis');

-- =============================================
-- SERVICES TÉLÉCOM
-- =============================================
INSERT INTO services (name, category, description, is_active, created_by) VALUES
('BSCS Billing System', 'BILLING', 'Système de facturation Ericsson BSCS iX pour opérateurs mobiles', TRUE, (SELECT id FROM users WHERE email = 'admin@billcom.tn')),
('CRM Ericsson', 'CRM', 'Plateforme CRM pour gestion relation client opérateur', TRUE, (SELECT id FROM users WHERE email = 'admin@billcom.tn')),
('Core Network OSS', 'NETWORK', 'Operations Support System - Supervision réseau cœur', TRUE, (SELECT id FROM users WHERE email = 'admin@billcom.tn')),
('VoIP Platform', 'NETWORK', 'Plateforme de téléphonie IP pour entreprises', TRUE, (SELECT id FROM users WHERE email = 'admin@billcom.tn')),
('Fibre FTTH', 'INFRA', 'Service fibre optique FTTH résidentiel et entreprise', TRUE, (SELECT id FROM users WHERE email = 'admin@billcom.tn')),
('Cloud VPS', 'INFRA', 'Serveurs virtuels privés hébergés en datacenter Tunis', TRUE, (SELECT id FROM users WHERE email = 'admin@billcom.tn'));

-- =============================================
-- TICKETS DE DÉMONSTRATION
-- =============================================
INSERT INTO tickets (ticket_number, title, description, client_id, service_id, assigned_to, created_by, category, priority, status, sla_hours, deadline, breached_sla, created_at) VALUES
('TKT-2026-00001', 'Panne facturation BSCS - CDR manquants',
 'Depuis ce matin, les CDR (Call Detail Records) ne sont plus traités par le module de rating BSCS. Environ 15000 CDR en attente.',
 (SELECT id FROM clients WHERE client_code = 'CLI-2026-00001'),
 (SELECT id FROM services WHERE name = 'BSCS Billing System'),
 (SELECT id FROM users WHERE email = 'agent1@billcom.tn'),
 (SELECT id FROM users WHERE email = 'client1@ericsson.tn'),
 'PANNE', 'CRITICAL', 'IN_PROGRESS', 1,
 DATE_ADD(NOW(), INTERVAL -2 HOUR),
 TRUE,
 DATE_ADD(NOW(), INTERVAL -3 HOUR)),

('TKT-2026-00002', 'Erreur synchronisation CRM contacts',
 'La synchronisation des contacts entre le CRM Ericsson et le système HLR ne fonctionne plus depuis la mise à jour de vendredi.',
 (SELECT id FROM clients WHERE client_code = 'CLI-2026-00001'),
 (SELECT id FROM services WHERE name = 'CRM Ericsson'),
 (SELECT id FROM users WHERE email = 'agent2@billcom.tn'),
 (SELECT id FROM users WHERE email = 'client1@ericsson.tn'),
 'PANNE', 'HIGH', 'IN_PROGRESS', 4,
 DATE_ADD(NOW(), INTERVAL 2 HOUR),
 FALSE,
 DATE_ADD(NOW(), INTERVAL -2 HOUR)),

('TKT-2026-00003', 'Demande activation offre Fibre Pro 200 Mbps',
 'Nous souhaitons activer l''offre Fibre Pro 200 Mbps pour notre nouveau bureau à Sousse. Merci de nous envoyer le devis.',
 (SELECT id FROM clients WHERE client_code = 'CLI-2026-00002'),
 (SELECT id FROM services WHERE name = 'Fibre FTTH'),
 NULL,
 (SELECT id FROM users WHERE email = 'client2@ooredoo.tn'),
 'DEMANDE', 'LOW', 'NEW', 72,
 DATE_ADD(NOW(), INTERVAL 72 HOUR),
 FALSE,
 DATE_ADD(NOW(), INTERVAL -1 HOUR)),

('TKT-2026-00004', 'Latence élevée sur VoIP entreprise',
 'Nos utilisateurs signalent une latence > 200ms sur les appels VoIP depuis 2 jours. Qualité dégradée, écho fréquent.',
 (SELECT id FROM clients WHERE client_code = 'CLI-2026-00002'),
 (SELECT id FROM services WHERE name = 'VoIP Platform'),
 (SELECT id FROM users WHERE email = 'agent1@billcom.tn'),
 (SELECT id FROM users WHERE email = 'client2@ooredoo.tn'),
 'PANNE', 'MEDIUM', 'PENDING', 24,
 DATE_ADD(NOW(), INTERVAL 20 HOUR),
 FALSE,
 DATE_ADD(NOW(), INTERVAL -4 HOUR)),

('TKT-2026-00005', 'Évolution Dashboard KPI Manager',
 'Ajouter des indicateurs de performance temps réel au dashboard manager: taux résolution J+1, temps moyen réponse agent.',
 (SELECT id FROM clients WHERE client_code = 'CLI-2026-00001'),
 (SELECT id FROM services WHERE name = 'CRM Ericsson'),
 NULL,
 (SELECT id FROM users WHERE email = 'client1@ericsson.tn'),
 'EVOLUTION', 'LOW', 'NEW', 72,
 DATE_ADD(NOW(), INTERVAL 72 HOUR),
 FALSE,
 NOW());

-- =============================================
-- COMMENTAIRES SUR LES TICKETS
-- =============================================
INSERT INTO ticket_comments (ticket_id, author_id, content, is_internal, created_at) VALUES
((SELECT id FROM tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'agent1@billcom.tn'),
 'J''ai identifié le problème : le processus de chargement CDR est bloqué sur une erreur de format. Je relance le service.', FALSE,
 DATE_ADD(NOW(), INTERVAL -2 HOUR)),

((SELECT id FROM tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'agent1@billcom.tn'),
 'Note interne: Vérifier les logs du serveur BSCS-PRD-01, partition /data à 95%.', TRUE,
 DATE_ADD(NOW(), INTERVAL -1 HOUR)),

((SELECT id FROM tickets WHERE ticket_number = 'TKT-2026-00002'),
 (SELECT id FROM users WHERE email = 'client1@ericsson.tn'),
 'Pouvez-vous nous donner un délai estimé pour la résolution ? C''est urgent pour notre équipe commerciale.', FALSE,
 DATE_ADD(NOW(), INTERVAL -1 HOUR)),

((SELECT id FROM tickets WHERE ticket_number = 'TKT-2026-00004'),
 (SELECT id FROM users WHERE email = 'agent1@billcom.tn'),
 'Test de latence effectué. Résultats : 180-220ms. Possible congestion switch S2. En attente retour équipe réseau.', FALSE,
 DATE_ADD(NOW(), INTERVAL -2 HOUR));

-- =============================================
-- HISTORIQUE DES TICKETS (AUDIT)
-- =============================================
INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value, details, ip_address, created_at) VALUES
((SELECT id FROM tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'client1@ericsson.tn'),
 'CREATION', NULL, 'NEW', 'Ticket créé', '192.168.1.100',
 DATE_ADD(NOW(), INTERVAL -3 HOUR)),

((SELECT id FROM tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'manager@billcom.tn'),
 'ASSIGNMENT', NULL, 'Ahmed Khelifi', 'Ticket assigné à agent1', '192.168.1.10',
 DATE_ADD(NOW(), INTERVAL -3 HOUR)),

((SELECT id FROM tickets WHERE ticket_number = 'TKT-2026-00001'),
 (SELECT id FROM users WHERE email = 'agent1@billcom.tn'),
 'STATUS_CHANGE', 'NEW', 'IN_PROGRESS', 'Prise en charge du ticket', '192.168.1.20',
 DATE_ADD(NOW(), INTERVAL -2 HOUR)),

((SELECT id FROM tickets WHERE ticket_number = 'TKT-2026-00004'),
 (SELECT id FROM users WHERE email = 'agent1@billcom.tn'),
 'STATUS_CHANGE', 'IN_PROGRESS', 'PENDING', 'En attente retour client sur tests réseau', '192.168.1.20',
 DATE_ADD(NOW(), INTERVAL -2 HOUR));
