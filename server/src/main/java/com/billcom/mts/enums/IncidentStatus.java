package com.billcom.mts.enums;

/**
 * Statut d'un incident de supervision.
 */
public enum IncidentStatus {
    OPEN("Ouvert", "Incident déclaré, en attente de prise en charge", "#ef4444"),
    IN_PROGRESS("En cours", "Incident en cours de résolution", "#f97316"),
    RESOLVED("Résolu", "Incident résolu, en attente de confirmation", "#22c55e"),
    CLOSED("Clôturé", "Incident clôturé avec post-mortem", "#6b7280");

    private final String label;
    private final String description;
    private final String colorHex;

    IncidentStatus(String label, String description, String colorHex) {
        this.label = label;
        this.description = description;
        this.colorHex = colorHex;
    }

    public String getLabel() { return label; }
    public String getDescription() { return description; }
    public String getColorHex() { return colorHex; }

    public boolean isActive() {
        return this == OPEN || this == IN_PROGRESS;
    }
}
