package com.billcom.mts.dto.sla;

import lombok.*;

/**
 * DTO pour les KPI de la page SLA & Escalade.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SlaEscalationStats {

    /** Taux de respect SLA global (0-100) */
    private double complianceRate;

    /** Nombre de tickets à risque (>= 80% SLA consommé, pas encore dépassé) */
    private long atRiskCount;

    /** Nombre de tickets SLA dépassé */
    private long breachedCount;

    /** Nombre de tickets actifs */
    private long activeCount;

    /** Nombre de tickets escaladés (escalation_level > 0) */
    private long escalatedCount;

    /** Nombre de règles d'escalade actives */
    private long activeRulesCount;

    /** Temps moyen de résolution en heures */
    private double averageResolutionHours;
}
