package com.billcom.mts.service;

import com.billcom.mts.entity.BusinessHours;
import com.billcom.mts.entity.Ticket;

import java.time.LocalDateTime;

/**
 * Service de calcul SLA prenant en compte les horaires ouvrés et les pauses.
 *
 * Responsabilités :
 * - Calcul de la deadline en heures ouvrées
 * - Calcul du temps SLA effectif (hors pauses et hors horaires fermés)
 * - Déclenchement pause/reprise SLA
 * - Indicateur "à risque"
 */
public interface SlaCalculationService {

    /**
     * Calcule la deadline d'un ticket en tenant compte des horaires ouvrés.
     *
     * @param startTime  instant de départ (createdAt du ticket)
     * @param slaHours   nombre d'heures SLA allouées
     * @param bh         horaires ouvrés (null = calcul 24/7)
     * @return deadline calculée
     */
    LocalDateTime calculateDeadline(LocalDateTime startTime, int slaHours, BusinessHours bh);

    /**
     * Calcule le pourcentage SLA consommé en heures ouvrées (hors pauses).
     *
     * @param ticket le ticket à évaluer
     * @param bh     horaires ouvrés (null = 24/7)
     * @return pourcentage 0-100
     */
    double calculateEffectivePercentage(Ticket ticket, BusinessHours bh);

    /**
     * Calcule les minutes SLA restantes en heures ouvrées (hors pauses).
     *
     * @param ticket le ticket
     * @param bh     horaires ouvrés (null = 24/7)
     * @return minutes restantes (négatif si dépassé)
     */
    long calculateRemainingMinutes(Ticket ticket, BusinessHours bh);

    /**
     * Pause le compteur SLA d'un ticket (quand statut passe à PENDING).
     */
    void pauseSla(Ticket ticket);

    /**
     * Reprend le compteur SLA d'un ticket (quand il quitte PENDING).
     */
    void resumeSla(Ticket ticket);

    /**
     * Indique si un ticket est "à risque" (&lt; 20% du temps restant).
     */
    boolean isAtRisk(Ticket ticket, BusinessHours bh);

    /**
     * Indique si un ticket a dépassé son SLA.
     */
    boolean isBreached(Ticket ticket, BusinessHours bh);
}
