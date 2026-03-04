package com.billcom.mts.service;

/**
 * Moteur d'escalade automatique.
 *
 * Évalue les règles configurées par l'Admin et exécute les actions
 * sur les tickets dont le SLA est à risque ou dépassé.
 */
public interface EscalationEngineService {

    /**
     * Évalue toutes les règles d'escalade sur les tickets actifs.
     * Appelé par le scheduler (toutes les 5 minutes).
     *
     * @return nombre de tickets escaladés
     */
    int evaluateAll();
}
