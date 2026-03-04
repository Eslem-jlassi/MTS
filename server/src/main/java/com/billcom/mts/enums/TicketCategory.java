package com.billcom.mts.enums;

/**
 * Ticket categories in MTS.
 */
public enum TicketCategory {
    /**
     * System outage, service failure
     */
    PANNE("Panne"),
    
    /**
     * Service request, configuration change
     */
    DEMANDE("Demande"),
    
    /**
     * Enhancement, new feature request
     */
    EVOLUTION("Évolution"),
    
    /**
     * Other issues
     */
    AUTRE("Autre");

    private final String label;

    TicketCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
