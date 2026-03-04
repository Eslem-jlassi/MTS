package com.billcom.mts.enums;

/**
 * ReportType - Types de rapports générés par les managers.
 * 
 * RÔLE DE CET ENUM:
 * Catégorise les rapports PDF uploadés selon leur périodicité.
 * Permet le filtrage et l'organisation des rapports.
 * 
 * UTILISATION:
 * - Managers génèrent des rapports périodiques (daily, weekly, monthly)
 * - Rapports trimestriels et annuels pour la direction
 * - Rapports custom pour des analyses spécifiques
 */
public enum ReportType {
    
    /**
     * Rapport journalier.
     */
    DAILY("Journalier", "Rapport quotidien des activités"),
    
    /**
     * Rapport hebdomadaire.
     */
    WEEKLY("Hebdomadaire", "Rapport de la semaine"),
    
    /**
     * Rapport mensuel.
     */
    MONTHLY("Mensuel", "Rapport du mois"),
    
    /**
     * Rapport trimestriel.
     */
    QUARTERLY("Trimestriel", "Rapport du trimestre"),
    
    /**
     * Rapport annuel.
     */
    ANNUAL("Annuel", "Rapport annuel"),
    
    /**
     * Rapport personnalisé (période libre).
     */
    CUSTOM("Personnalisé", "Rapport sur période personnalisée");

    // =========================================================================
    // PROPRIÉTÉS
    // =========================================================================
    
    private final String label;
    private final String description;

    // =========================================================================
    // CONSTRUCTEUR
    // =========================================================================
    
    ReportType(String label, String description) {
        this.label = label;
        this.description = description;
    }

    // =========================================================================
    // GETTERS
    // =========================================================================
    
    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }
}
