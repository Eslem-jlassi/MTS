-- =============================================================================
-- V36__professionalize_demo_baseline.sql
-- Harmonisation des donnees de demonstration visibles et de la timezone par defaut
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Comptes de demonstration MySQL aligns sur le jeu H2/documentation
-- ---------------------------------------------------------------------------
UPDATE users src
LEFT JOIN users target
       ON target.email = 'admin@mts-telecom.ma'
      AND target.id <> src.id
SET src.email = 'admin@mts-telecom.ma',
    src.first_name = 'Mohammed',
    src.last_name = 'Benali',
    src.phone = '+212 5 22 00 00 01'
WHERE src.email = 'admin@billcom.tn'
  AND target.id IS NULL;

UPDATE users src
LEFT JOIN users target
       ON target.email = 'manager@mts-telecom.ma'
      AND target.id <> src.id
SET src.email = 'manager@mts-telecom.ma',
    src.first_name = 'Sara',
    src.last_name = 'El Fassi',
    src.phone = '+212 5 22 00 00 02'
WHERE src.email = 'manager@billcom.tn'
  AND target.id IS NULL;

UPDATE users src
LEFT JOIN users target
       ON target.email = 'karim.agent@mts-telecom.ma'
      AND target.id <> src.id
SET src.email = 'karim.agent@mts-telecom.ma',
    src.first_name = 'Karim',
    src.last_name = 'Ziani',
    src.phone = '+212 5 22 00 00 03'
WHERE src.email = 'agent1@billcom.tn'
  AND target.id IS NULL;

UPDATE users src
LEFT JOIN users target
       ON target.email = 'layla.agent@mts-telecom.ma'
      AND target.id <> src.id
SET src.email = 'layla.agent@mts-telecom.ma',
    src.first_name = 'Layla',
    src.last_name = 'Amrani',
    src.phone = '+212 5 22 00 00 04'
WHERE src.email = 'agent2@billcom.tn'
  AND target.id IS NULL;

UPDATE users src
LEFT JOIN users target
       ON target.email = 'support@atlas-distribution.ma'
      AND target.id <> src.id
SET src.email = 'support@atlas-distribution.ma',
    src.first_name = 'Samir',
    src.last_name = 'Alaoui',
    src.phone = '+212 5 22 00 00 05'
WHERE src.email = 'client1@ericsson.tn'
  AND target.id IS NULL;

UPDATE users src
LEFT JOIN users target
       ON target.email = 'dsi@sahara-connect.ma'
      AND target.id <> src.id
SET src.email = 'dsi@sahara-connect.ma',
    src.first_name = 'Nadia',
    src.last_name = 'Belkacem',
    src.phone = '+212 5 22 00 00 06'
WHERE src.email = 'client2@ooredoo.tn'
  AND target.id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Clients demo
-- ---------------------------------------------------------------------------
UPDATE clients src
LEFT JOIN clients target
       ON target.client_code = 'CLI-2026-00001'
      AND target.id <> src.id
SET src.client_code = 'CLI-2026-00001',
    src.company_name = 'Atlas Distribution Maroc',
    src.address = 'Boulevard Ghandi, Casablanca'
WHERE src.company_name = 'Ericsson Tunisia'
  AND target.id IS NULL;

UPDATE clients
SET company_name = 'Atlas Distribution Maroc',
    address = 'Boulevard Ghandi, Casablanca'
WHERE client_code = 'CLI-2026-00001';

UPDATE clients src
LEFT JOIN clients target
       ON target.client_code = 'CLI-2026-00002'
      AND target.id <> src.id
SET src.client_code = 'CLI-2026-00002',
    src.company_name = 'Sahara Connect Services',
    src.address = 'Hay Riad, Rabat'
WHERE src.company_name = 'Ooredoo Tunisie'
  AND target.id IS NULL;

UPDATE clients
SET company_name = 'Sahara Connect Services',
    address = 'Hay Riad, Rabat'
WHERE client_code = 'CLI-2026-00002';

-- ---------------------------------------------------------------------------
-- 3. Services demo visibles
-- ---------------------------------------------------------------------------
UPDATE services
SET description = 'Plateforme de facturation telecom pour le rating, la mediation et la valorisation des usages.'
WHERE name = 'BSCS Billing System';

UPDATE services
SET description = 'Plateforme CRM pour la gestion de la relation client, des comptes et des parcours support.'
WHERE name = 'CRM Ericsson';

UPDATE services
SET description = 'Supervision coeur de reseau et collecte des KPI d exploitation telecom.'
WHERE name = 'Core Network OSS';

UPDATE services
SET description = 'Telephonie IP multi-sites et trunks SIP pour les centres de contacts et sites entreprise.'
WHERE name = 'VoIP Platform';

UPDATE services
SET description = 'Acces fibre optique FTTH / FTTO pour les sites entreprise et les liaisons critiques.'
WHERE name = 'Fibre FTTH';

UPDATE services
SET description = 'Hebergement cloud prive pour workloads telecom et applications support.'
WHERE name = 'Cloud VPS';

-- ---------------------------------------------------------------------------
-- 4. Tickets demo plus coherents avec le positionnement MTS Telecom
-- ---------------------------------------------------------------------------
UPDATE tickets
SET title = 'Blocage du rating BSCS sur les CDR roaming entrants',
    description = 'Depuis 06:20 les CDR roaming entrants ne sont plus valorises dans BSCS. Le backlog depasse 42000 enregistrements et les soldes postpayes ne sont plus mis a jour.'
WHERE ticket_number = 'TKT-2026-00001';

UPDATE tickets
SET title = 'Desynchronisation des fiches clients CRM vers BSCS',
    description = 'Les creations de comptes corporate dans le CRM ne remontent plus vers BSCS depuis la derniere mise a jour. Les dossiers commerciaux restent bloques.'
WHERE ticket_number = 'TKT-2026-00002';

UPDATE tickets
SET title = 'Ouverture de 12 canaux SIP supplementaires',
    description = 'Le centre de relation client demande 12 canaux SIP supplementaires sur le trunk principal avant la prochaine campagne d appels sortants.'
WHERE ticket_number = 'TKT-2026-00003';

UPDATE tickets
SET title = 'Qualite degradee sur le trunk VoIP principal',
    description = 'Les utilisateurs signalent une latence elevee et des coupures intermittentes sur les appels VoIP. La qualite de service est degradee sur le site principal.'
WHERE ticket_number = 'TKT-2026-00004';

UPDATE tickets
SET title = 'Evolution dashboard KPI supervision manager',
    description = 'Ajouter des indicateurs de performance temps reel au dashboard manager: taux de resolution J+1, temps moyen de reponse agent et suivi SLA.'
WHERE ticket_number = 'TKT-2026-00005';

-- ---------------------------------------------------------------------------
-- 5. Commentaires / historique visibles dans le detail ticket
-- ---------------------------------------------------------------------------
UPDATE ticket_comments
SET content = 'Analyse en cours: le processus de chargement CDR est bloque sur une erreur de format. Relance du service engagee.'
WHERE content LIKE 'J''ai identifi%';

UPDATE ticket_comments
SET content = 'Note interne: verifier les logs du serveur BSCS-PRD-01 et la saturation de la partition /data.'
WHERE content LIKE 'Note interne:%';

UPDATE ticket_comments
SET content = 'Pouvez-vous nous confirmer un delai estime de resolution ? Le blocage impacte notre equipe commerciale.'
WHERE content LIKE 'Pouvez-vous nous donner%';

UPDATE ticket_history
SET details = 'Ticket cree'
WHERE details = 'Ticket crÃ©Ã©';

UPDATE ticket_history
SET details = 'Ticket assigne a Karim Ziani',
    new_value = 'Karim Ziani'
WHERE details = 'Ticket assignÃ© Ã  agent1';

UPDATE ticket_history
SET details = 'Prise en charge du ticket'
WHERE details = 'Prise en charge du ticket';

UPDATE ticket_history
SET details = 'En attente retour client sur tests reseau'
WHERE details = 'En attente retour client sur tests rÃ©seau';

-- ---------------------------------------------------------------------------
-- 6. Timezone / business hours par defaut
-- ---------------------------------------------------------------------------
UPDATE business_hours
SET name = CASE
        WHEN is_default = TRUE THEN 'Standard MTS Telecom'
        ELSE name
    END,
    timezone = 'Europe/Paris'
WHERE timezone = 'Africa/Tunis'
   OR (is_default = TRUE AND name = 'Standard Billcom');
