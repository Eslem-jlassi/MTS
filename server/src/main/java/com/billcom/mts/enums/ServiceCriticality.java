package com.billcom.mts.enums;

/**
 * Criticité d'un service télécom (importance business).
 */
public enum ServiceCriticality {
    CRITICAL("Critique", "Service vital, indisponibilité = perte de revenus"),
    HIGH("Haute", "Service important, impact opérationnel fort"),
    MEDIUM("Moyenne", "Service standard"),
    LOW("Basse", "Service non-essentiel");

    private final String label;
    private final String description;

    ServiceCriticality(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() { return label; }
    public String getDescription() { return description; }
}
