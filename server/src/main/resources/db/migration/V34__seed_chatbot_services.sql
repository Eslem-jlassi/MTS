-- =============================================================================
-- V34__seed_chatbot_services.sql
-- Adds the telecom services used by the AI chatbot corpus so ticket drafts can
-- be resolved to real services without manual remapping.
-- =============================================================================

INSERT INTO services (name, category, description, is_active, created_by)
SELECT
    'Data Migration Engine',
    'INFRA',
    'ETL and reconciliation engine used during customer and billing migrations',
    TRUE,
    u.id
FROM users u
WHERE u.role = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM services s
      WHERE LOWER(s.name) = LOWER('Data Migration Engine')
  )
LIMIT 1;

INSERT INTO services (name, category, description, is_active, created_by)
SELECT
    'Mobile Portability Gateway',
    'NETWORK',
    'Gateway managing mobile number portability flows and operator exchanges',
    TRUE,
    u.id
FROM users u
WHERE u.role = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM services s
      WHERE LOWER(s.name) = LOWER('Mobile Portability Gateway')
  )
LIMIT 1;

INSERT INTO services (name, category, description, is_active, created_by)
SELECT
    'Order Care API',
    'CRM',
    'Order management and customer care API used by business support systems',
    TRUE,
    u.id
FROM users u
WHERE u.role = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM services s
      WHERE LOWER(s.name) = LOWER('Order Care API')
  )
LIMIT 1;

INSERT INTO services (name, category, description, is_active, created_by)
SELECT
    'Provisioning Platform',
    'NETWORK',
    'Service activation and provisioning platform for HLR HSS and related flows',
    TRUE,
    u.id
FROM users u
WHERE u.role = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM services s
      WHERE LOWER(s.name) = LOWER('Provisioning Platform')
  )
LIMIT 1;
