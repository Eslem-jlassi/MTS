package com.billcom.mts.enums;

/**
 * Types d'événements dans la timeline d'un incident.
 */
public enum IncidentTimelineEventType {
    STATUS_CHANGE("Changement de statut"),
    NOTE("Note"),
    UPDATE("Mise à jour"),
    POST_MORTEM("Post-mortem"),
    TICKET_LINKED("Ticket lié"),
    TICKET_UNLINKED("Ticket délié"),
    SERVICE_ADDED("Service ajouté"),
    SERVICE_REMOVED("Service retiré");

    private final String label;

    IncidentTimelineEventType(String label) {
        this.label = label;
    }

    public String getLabel() { return label; }
}
