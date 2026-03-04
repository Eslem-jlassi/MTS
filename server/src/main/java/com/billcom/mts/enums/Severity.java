package com.billcom.mts.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Sévérité des incidents télécom selon les standards ITIL/Ericsson.
 * Chaque niveau définit un SLA (Service Level Agreement) spécifique.
 * 
 * Contexte métier Billcom Consulting:
 * - CRITICAL: Panne majeure affectant >10 000 clients (ex: BSCS facturation down)
 * - MAJOR: Service dégradé affectant un segment de clients
 * - MINOR: Anomalie avec contournement possible
 * - LOW: Amélioration ou optimisation non urgente
 */
@Getter
@RequiredArgsConstructor
public enum Severity {
    
    CRITICAL("Critique", 1, "#dc2626", 1, "P1"),      // SLA 1h, Rouge - Priorité maximale
    MAJOR("Majeur", 2, "#ea580c", 4, "P2"),           // SLA 4h, Orange
    MINOR("Mineur", 3, "#ca8a04", 24, "P3"),          // SLA 24h, Jaune
    LOW("Faible", 4, "#16a34a", 72, "P4");            // SLA 72h, Vert

    private final String label;
    private final int priority;           // Pour tri (1 = plus urgent)
    private final String colorHex;        // Code couleur pour frontend React
    private final int slaHours;           // Délai max résolution en heures
    private final String ericssonCode;    // Code Ericsson standard (P1-P4)

    /**
     * Vérifie si le SLA est dépassé en fonction du temps écoulé.
     * @param elapsedHours Heures écoulées depuis création du ticket
     * @return true si le SLA est dépassé
     */
    public boolean isSlaBreached(long elapsedHours) {
        return elapsedHours > this.slaHours;
    }

    /**
     * Calcule le pourcentage du SLA consommé.
     * @param elapsedHours Heures écoulées depuis création du ticket
     * @return Pourcentage (peut dépasser 100%)
     */
    public double getSlaPercentage(long elapsedHours) {
        return (elapsedHours * 100.0) / this.slaHours;
    }

    /**
     * Retourne le temps restant avant dépassement du SLA.
     * @param elapsedHours Heures écoulées depuis création du ticket
     * @return Heures restantes (négatif si dépassé)
     */
    public long getRemainingHours(long elapsedHours) {
        return this.slaHours - elapsedHours;
    }
}
