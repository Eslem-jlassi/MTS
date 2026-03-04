package com.billcom.mts.enums;

/**
 * Filtre SLA pour la liste des tickets.
 * - OK: dans les temps (&gt; 20% temps restant)
 * - AT_RISK: à risque (&lt; 20% temps restant, non dépassé)
 * - BREACHED: dépassé
 */
public enum SlaStatus {
    OK,
    AT_RISK,
    BREACHED
}
