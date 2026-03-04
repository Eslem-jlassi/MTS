ALTER TABLE services
MODIFY COLUMN category VARCHAR(20) NOT NULL;

UPDATE services
SET category = UPPER(category);
