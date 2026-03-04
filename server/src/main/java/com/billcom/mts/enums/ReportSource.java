package com.billcom.mts.enums;

/**
 * ReportSource - Origine du rapport (upload manuel ou généré par le système).
 */
public enum ReportSource {
    UPLOADED("Uploadé", "Rapport PDF uploadé par un manager"),
    GENERATED("Généré", "Rapport généré automatiquement à partir des tickets et incidents");

    private final String label;
    private final String description;

    ReportSource(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }
}
