package com.billcom.mts.enums;

/**
 * Impact d'un incident sur les opérations.
 */
public enum IncidentImpact {
    LOCALIZED("Localisé", "Impact limité à un composant"),
    PARTIAL("Partiel", "Plusieurs composants affectés"),
    MAJOR("Majeur", "Impact significatif sur la production"),
    TOTAL("Total", "Panne totale, tous les utilisateurs affectés");

    private final String label;
    private final String description;

    IncidentImpact(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() { return label; }
    public String getDescription() { return description; }
}
