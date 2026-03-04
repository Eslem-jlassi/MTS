-- services.category
ALTER TABLE services
  MODIFY COLUMN category VARCHAR(20) NOT NULL;

-- ticket_history.action
ALTER TABLE ticket_history
  MODIFY COLUMN action VARCHAR(30) NOT NULL;
