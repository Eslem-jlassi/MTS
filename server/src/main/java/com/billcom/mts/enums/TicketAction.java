package com.billcom.mts.enums;

/**
 * Actions logged in ticket history for audit trail.
 */
public enum TicketAction {
    /**
     * Ticket created
     */
    CREATION("Création"),
    
    /**
     * Status changed (e.g., NEW -> IN_PROGRESS)
     */
    STATUS_CHANGE("Changement de statut"),
    
    /**
     * Ticket assigned or reassigned to agent
     */
    ASSIGNMENT("Assignation"),
    
    /**
     * Ticket unassigned
     */
    UNASSIGNMENT("Désassignation"),
    
    /**
     * Priority changed
     */
    PRIORITY_CHANGE("Changement de priorité"),
    
    /**
     * Public comment added
     */
    COMMENT("Commentaire"),
    
    /**
     * Internal note added (visible only to agents/managers)
     */
    INTERNAL_NOTE("Note interne"),
    
    /**
     * Ticket updated (title, description, etc.)
     */
    UPDATE("Mise à jour"),
    
    /**
     * SLA breached
     */
    SLA_BREACH("Dépassement SLA"),

    /**
     * SLA paused (ticket went to PENDING)
     */
    SLA_PAUSED("SLA pausé"),

    /**
     * SLA resumed (ticket left PENDING)
     */
    SLA_RESUMED("SLA repris"),

    /**
     * Automatic escalation triggered
     */
    ESCALATION("Escalade automatique"),
    
    /**
     * Ticket reopened after resolution
     */
    REOPEN("Réouverture");

    private final String label;

    TicketAction(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
