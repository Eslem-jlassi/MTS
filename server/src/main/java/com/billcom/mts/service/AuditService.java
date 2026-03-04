package com.billcom.mts.service;

import com.billcom.mts.entity.User;

/**
 * Service d'audit - enregistre les actions critiques (création, modification, suppression)
 * sur les entités Ticket, Incident, Service, User.
 * Phase 6.
 */
public interface AuditService {

    void log(String entityType, String entityId, String action, User user, String details, String ipAddress);
}
