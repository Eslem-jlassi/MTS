package com.billcom.mts.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

// =============================================================================
// ENUM DES STATUTS DE TICKET
// =============================================================================
/**
 * ============================================================================
 * TicketStatus - Enumération des statuts du cycle de vie d'un ticket
 * ============================================================================
 * 
 * CYCLE DE VIE D'UN TICKET (WORKFLOW ITIL):
 * -----------------------------------------
 * 
 *                          ┌─────────────────────────────────────────────┐
 *                          │                                             │
 *     ┌──────┐         ┌───▼───────────┐         ┌──────────┐    ┌───────▼───┐
 *     │  NEW │────────>│  IN_PROGRESS  │────────>│ RESOLVED │───>│  CLOSED   │
 *     └──────┘         └───────────────┘         └──────────┘    └───────────┘
 *         │                    │                      │
 *         │                    │                      │ (Réouverture)
 *         │                    ▼                      ▼
 *         │              ┌──────────┐           ┌───────────────┐
 *         └─────────────>│ CANCELLED│           │  IN_PROGRESS  │
 *                        └──────────┘           └───────────────┘
 *                              │
 *                    ┌────────┤
 *                    │        │
 *               ┌────▼───┐ ┌──▼───────┐
 *               │ PENDING │ │ ESCALATED│
 *               └─────────┘ └──────────┘
 * 
 * RÈGLE IMPORTANTE:
 * Un ticket n'est JAMAIS supprimé physiquement (conformité légale/audit).
 * Il passe par le cycle de vie jusqu'à CLOSED ou CANCELLED.
 * 
 * PROPRIÉTÉS DE CHAQUE STATUT:
 * - label: Texte affiché à l'utilisateur
 * - iconCode: Code pour l'icône frontend (Lucide/Heroicons)
 * - colorHex: Couleur pour l'affichage
 * - slaRunning: Est-ce que le compteur SLA tourne dans cet état?
 * - terminal: État final (pas de retour possible)
 * 
 * ============================================================================
 */
@Getter               // Lombok: génère les getters pour tous les champs
@RequiredArgsConstructor  // Lombok: génère le constructeur avec les champs final
public enum TicketStatus {
    
    // =========================================================================
    // DÉFINITION DES STATUTS
    // =========================================================================
    // Format: NOM("label", "iconCode", "#colorHex", slaRunning, terminal)
    
    /**
     * NEW - Nouveau ticket, vient d'être créé.
     * SLA: OUI (le compteur démarre dès la création)
     * Terminal: NON
     */
    NEW("Nouveau", "inbox", "#6366f1", true, false),

    /**
     * ASSIGNED - Ticket assigné à un agent, en attente de prise en charge.
     * SLA: OUI
     * Terminal: NON
     */
    ASSIGNED("Assigné", "user-check", "#8b5cf6", true, false),
    
    /**
     * IN_PROGRESS - Ticket en cours de traitement par un agent.
     * SLA: OUI
     * Terminal: NON
     */
    IN_PROGRESS("En cours", "loader", "#3b82f6", true, false),
    
    /**
     * PENDING - En attente d'une réponse du client.
     * SLA: NON (le compteur est en pause, pas de pénalité pour l'agent)
     * Terminal: NON
     */
    PENDING("En attente client", "pause", "#f59e0b", false, false),

    /**
     * PENDING_THIRD_PARTY - En attente d'un tiers (fournisseur, sous-traitant).
     * SLA: OUI (le temps continue)
     * Terminal: NON
     */
    PENDING_THIRD_PARTY("En attente tiers", "clock", "#f97316", true, false),
    
    /**
     * ESCALATED - Escaladé au niveau supérieur (manager/expert).
     * SLA: OUI (l'escalade n'arrête pas le SLA)
     * Terminal: NON
     */
    ESCALATED("Escaladé", "alert-triangle", "#ef4444", true, false),
    
    /**
     * RESOLVED - Problème résolu, en attente de confirmation client.
     * SLA: NON (le travail est fait)
     * Terminal: NON (peut être réouvert si le client n'est pas satisfait)
     */
    RESOLVED("Résolu", "check-circle", "#10b981", false, false),
    
    /**
     * CLOSED - Ticket définitivement fermé.
     * SLA: NON
     * Terminal: OUI (pas de retour possible)
     */
    CLOSED("Clôturé", "archive", "#6b7280", false, true),
    
    /**
     * CANCELLED - Ticket annulé (demande client ou doublon).
     * SLA: NON
     * Terminal: OUI (pas de retour possible)
     */
    CANCELLED("Annulé", "x-circle", "#9ca3af", false, true);

    // =========================================================================
    // PROPRIÉTÉS DE L'ENUM
    // =========================================================================
    
    /** Label affiché à l'utilisateur (en français) */
    private final String label;
    
    /** Code de l'icône pour le frontend (Lucide Icons) */
    private final String iconCode;
    
    /** Code couleur hexadécimal pour l'affichage */
    private final String colorHex;
    
    /** Indique si le compteur SLA tourne dans cet état */
    private final boolean slaRunning;
    
    /** Indique si c'est un état final (pas de retour) */
    private final boolean terminal;

    // =========================================================================
    // MÉTHODES DE WORKFLOW
    // =========================================================================

    /**
     * Vérifie si la transition vers un autre statut est autorisée.
     * 
     * RÈGLES MÉTIER:
     * - Pas de retour depuis un état terminal (CLOSED, CANCELLED)
     * - PENDING peut revenir à IN_PROGRESS (client a répondu)
     * - RESOLVED peut être réouvert (plainte client)
     * 
     * @param target Le statut cible
     * @return true si la transition est autorisée
     */
    public boolean canTransitionTo(TicketStatus target) {
        // Impossible de quitter un état terminal
        if (this.terminal) {
            return false;
        }
        
        // Règles de transition par statut (Java 17+ switch expression)
        return switch (this) {
            case NEW -> target == ASSIGNED || target == IN_PROGRESS || target == CANCELLED;
            case ASSIGNED -> target == IN_PROGRESS || target == RESOLVED || target == CANCELLED;
            case IN_PROGRESS -> target == PENDING || target == PENDING_THIRD_PARTY || target == RESOLVED || target == ESCALATED;
            case PENDING -> target == IN_PROGRESS || target == RESOLVED || target == CANCELLED;
            case PENDING_THIRD_PARTY -> target == IN_PROGRESS || target == RESOLVED || target == ESCALATED;
            case ESCALATED -> target == IN_PROGRESS || target == RESOLVED;
            case RESOLVED -> target == CLOSED || target == IN_PROGRESS; // Réouverture possible
            case CLOSED, CANCELLED -> false;
        };
    }

    /**
     * Retourne la liste des transitions autorisées depuis ce statut.
     * 
     * Utile pour le frontend: afficher uniquement les boutons
     * de changement de statut autorisés.
     * 
     * @return Tableau des statuts atteignables
     */
    public TicketStatus[] getAllowedTransitions() {
        return switch (this) {
            case NEW -> new TicketStatus[]{ASSIGNED, IN_PROGRESS, CANCELLED};
            case ASSIGNED -> new TicketStatus[]{IN_PROGRESS, RESOLVED, CANCELLED};
            case IN_PROGRESS -> new TicketStatus[]{PENDING, PENDING_THIRD_PARTY, RESOLVED, ESCALATED};
            case PENDING -> new TicketStatus[]{IN_PROGRESS, RESOLVED, CANCELLED};
            case PENDING_THIRD_PARTY -> new TicketStatus[]{IN_PROGRESS, RESOLVED, ESCALATED};
            case ESCALATED -> new TicketStatus[]{IN_PROGRESS, RESOLVED};
            case RESOLVED -> new TicketStatus[]{CLOSED, IN_PROGRESS};
            case CLOSED, CANCELLED -> new TicketStatus[]{};
        };
    }

    /**
     * Vérifie si c'est un statut actif (ticket non terminé).
     * 
     * Un ticket actif nécessite une action.
     * Utilisé pour les compteurs du dashboard.
     * 
     * @return true si le ticket est actif
     */
    public boolean isActive() {
        return !terminal && this != RESOLVED;
    }
}
// =============================================================================
// FIN DE L'ENUM TicketStatus
// =============================================================================
