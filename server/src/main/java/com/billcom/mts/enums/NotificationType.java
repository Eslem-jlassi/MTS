package com.billcom.mts.enums;

/**
 * NotificationType - Types de notifications système.
 * 
 * RÔLE DE CET ENUM:
 * Catégorise les notifications pour permettre le filtrage,
 * l'affichage différencié et la gestion des préférences utilisateur.
 * 
 * CATÉGORIES:
 * 1. Notifications générales (INFO, WARNING, ERROR, SUCCESS)
 * 2. Notifications tickets (TICKET_*)
 * 3. Notifications SLA (SLA_*)
 * 4. Notifications services (SERVICE_*)
 * 5. Notifications rapports (REPORT_*)
 */
public enum NotificationType {
    
    // =========================================================================
    // NOTIFICATIONS GÉNÉRALES
    // =========================================================================
    
    /**
     * Information générale (non urgente).
     */
    INFO("Information", "info"),
    
    /**
     * Avertissement (attention requise).
     */
    WARNING("Avertissement", "warning"),
    
    /**
     * Erreur système.
     */
    ERROR("Erreur", "error"),
    
    /**
     * Action réussie.
     */
    SUCCESS("Succès", "success"),
    
    // =========================================================================
    // NOTIFICATIONS TICKETS
    // =========================================================================
    
    /**
     * Un nouveau ticket a été créé.
     * Destinataires: Agents, Managers, Admins
     */
    TICKET_CREATED("Nouveau ticket", "ticket"),
    
    /**
     * Un ticket a été assigné à un agent.
     * Destinataires: Agent concerné
     */
    TICKET_ASSIGNED("Ticket assigné", "ticket"),
    
    /**
     * Un ticket a été réassigné à un autre agent.
     * Destinataires: Ancien agent, Nouvel agent
     */
    TICKET_REASSIGNED("Ticket réassigné", "ticket"),
    
    /**
     * Le statut d'un ticket a changé.
     * Destinataires: Client, Agent assigné
     */
    TICKET_STATUS_CHANGED("Statut modifié", "ticket"),
    
    /**
     * Un commentaire a été ajouté à un ticket.
     * Destinataires: Client (si public), Agent (si interne)
     */
    TICKET_COMMENT("Nouveau commentaire", "ticket"),
    
    /**
     * Un ticket a été résolu.
     * Destinataires: Client
     */
    TICKET_RESOLVED("Ticket résolu", "ticket"),
    
    /**
     * Un ticket a été fermé.
     * Destinataires: Client
     */
    TICKET_CLOSED("Ticket fermé", "ticket"),
    
    // =========================================================================
    // NOTIFICATIONS SLA
    // =========================================================================
    
    /**
     * SLA approche de l'échéance (ex: 75% du temps écoulé).
     * Destinataires: Agent assigné, Manager
     */
    SLA_WARNING("Alerte SLA", "sla"),
    
    /**
     * SLA dépassé (breach).
     * Destinataires: Agent assigné, Manager, Admin
     */
    SLA_BREACH("SLA dépassé", "sla"),

    /**
     * Escalade niveau 1 (SLA à risque).
     * Destinataires: Manager
     */
    ESCALATION_LEVEL_1("Escalade niveau 1", "sla"),

    /**
     * Escalade niveau 2 (SLA dépassé).
     * Destinataires: Manager, Admin
     */
    ESCALATION_LEVEL_2("Escalade niveau 2", "sla"),

    /**
     * SLA pausé (ticket en attente client).
     * Destinataires: Agent assigné
     */
    SLA_PAUSED("SLA pausé", "sla"),

    /**
     * SLA repris (ticket sort d'attente).
     * Destinataires: Agent assigné
     */
    SLA_RESUMED("SLA repris", "sla"),
    
    // =========================================================================
    // NOTIFICATIONS SERVICES
    // =========================================================================
    
    /**
     * Un service est passé en état DOWN.
     * Destinataires: Admins, Managers
     */
    SERVICE_DOWN("Service en panne", "service"),
    
    /**
     * Un service est passé en état DEGRADED.
     * Destinataires: Admins, Managers
     */
    SERVICE_DEGRADED("Service dégradé", "service"),
    
    /**
     * Un service est revenu à l'état UP.
     * Destinataires: Admins, Managers
     */
    SERVICE_RESTORED("Service restauré", "service"),
    
    // =========================================================================
    // NOTIFICATIONS RAPPORTS
    // =========================================================================
    
    /**
     * Un nouveau rapport a été publié.
     * Destinataires: Managers, Admins
     */
    REPORT_PUBLISHED("Rapport publié", "report");

    // =========================================================================
    // PROPRIÉTÉS
    // =========================================================================
    
    private final String label;
    private final String category;

    // =========================================================================
    // CONSTRUCTEUR
    // =========================================================================
    
    NotificationType(String label, String category) {
        this.label = label;
        this.category = category;
    }

    // =========================================================================
    // GETTERS
    // =========================================================================
    
    /**
     * Retourne le label pour l'affichage UI.
     */
    public String getLabel() {
        return label;
    }

    /**
     * Retourne la catégorie (pour filtrage/groupement).
     */
    public String getCategory() {
        return category;
    }

    // =========================================================================
    // MÉTHODES UTILITAIRES
    // =========================================================================
    
    /**
     * Indique si cette notification est urgente et doit être mise en évidence.
     */
    public boolean isUrgent() {
        return this == SLA_BREACH || this == ESCALATION_LEVEL_2 || this == SERVICE_DOWN || this == ERROR;
    }

    /**
     * Indique si cette notification concerne les tickets.
     */
    public boolean isTicketRelated() {
        return category.equals("ticket");
    }

    /**
     * Indique si cette notification concerne les SLA.
     */
    public boolean isSlaRelated() {
        return category.equals("sla");
    }

    /**
     * Indique si cette notification concerne les services.
     */
    public boolean isServiceRelated() {
        return category.equals("service");
    }
}
