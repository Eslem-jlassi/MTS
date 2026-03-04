package com.billcom.mts.enums;

/**
 * ServiceStatus - États possibles d'un service télécom.
 * 
 * RÔLE DE CET ENUM:
 * Définit les états opérationnels d'un service supervisé.
 * Permet de signaler les pannes et dégradations aux utilisateurs.
 * 
 * ÉTATS:
 * - UP: Service opérationnel, aucun problème
 * - DEGRADED: Service partiellement opérationnel, performances réduites
 * - DOWN: Service en panne complète, indisponible
 * - MAINTENANCE: Service en maintenance planifiée
 * 
 * UTILISATION:
 * - Affichage dans le dashboard admin
 * - Déclenchement de notifications automatiques
 * - Filtrage des services par état
 * 
 * WORKFLOW TYPIQUE:
 * UP -> DEGRADED (problème détecté)
 * DEGRADED -> DOWN (panne totale)
 * DOWN -> MAINTENANCE (intervention planifiée)
 * MAINTENANCE -> UP (retour à la normale)
 */
public enum ServiceStatus {
    
    /**
     * Service opérationnel - Tout fonctionne normalement.
     * Couleur UI suggérée: Vert (#22c55e)
     */
    UP("Opérationnel", "Le service fonctionne normalement"),
    
    /**
     * Service dégradé - Fonctionne mais avec des problèmes.
     * Couleur UI suggérée: Orange (#f97316)
     */
    DEGRADED("Dégradé", "Le service rencontre des problèmes de performance"),
    
    /**
     * Service en panne - Complètement indisponible.
     * Couleur UI suggérée: Rouge (#ef4444)
     */
    DOWN("En panne", "Le service est actuellement indisponible"),
    
    /**
     * Service en maintenance - Indisponible pour maintenance planifiée.
     * Couleur UI suggérée: Bleu (#3b82f6)
     */
    MAINTENANCE("Maintenance", "Le service est en cours de maintenance");

    // =========================================================================
    // PROPRIÉTÉS
    // =========================================================================
    
    private final String label;
    private final String description;

    // =========================================================================
    // CONSTRUCTEUR
    // =========================================================================
    
    ServiceStatus(String label, String description) {
        this.label = label;
        this.description = description;
    }

    // =========================================================================
    // GETTERS
    // =========================================================================
    
    /**
     * Retourne le label localisé (français) pour l'UI.
     */
    public String getLabel() {
        return label;
    }

    /**
     * Retourne la description détaillée.
     */
    public String getDescription() {
        return description;
    }

    // =========================================================================
    // MÉTHODES UTILITAIRES
    // =========================================================================
    
    /**
     * Indique si le service est disponible (UP ou DEGRADED).
     */
    public boolean isAvailable() {
        return this == UP || this == DEGRADED;
    }

    /**
     * Indique si le service nécessite une attention urgente.
     */
    public boolean isUrgent() {
        return this == DOWN;
    }

    /**
     * Retourne le niveau de sévérité (pour tri).
     * 0 = normal, 3 = critique
     */
    public int getSeverityLevel() {
        return switch (this) {
            case UP -> 0;
            case MAINTENANCE -> 1;
            case DEGRADED -> 2;
            case DOWN -> 3;
        };
    }
}
