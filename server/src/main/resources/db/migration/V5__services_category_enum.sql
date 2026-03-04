ALTER TABLE services
MODIFY COLUMN category ENUM('billing','crm','network','infra','other') NOT NULL;
SELECT DISTINCT category FROM services;
UPDATE services SET category='billing' WHERE category IN ('BILLING','Billing');
UPDATE services SET category='crm'     WHERE category IN ('CRM','Crm');
UPDATE services SET category='network' WHERE category IN ('NETWORK','Network');
UPDATE services SET category='infra'   WHERE category IN ('INFRA','Infra');
UPDATE services SET category='other'   WHERE category IS NULL OR category='';
