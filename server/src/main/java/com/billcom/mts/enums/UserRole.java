package com.billcom.mts.enums;

// =============================================================================
// ENUM DES RÔLES UTILISATEUR
// =============================================================================
/**
 * ============================================================================
 * UserRole - Enumération des rôles utilisateurs MTS Telecom
 * ============================================================================
 * 
 * QU'EST-CE QU'UN ENUM?
 * ---------------------
 * Un enum (enumeration) est un type Java qui représente un ensemble fixe
 * de constantes. Ici, les 4 rôles possibles dans l'application.
 * 
 * HIÉRARCHIE DES RÔLES:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                           ADMIN                                         │
 * │  - Accès complet à tout le système                                      │
 * │  - Gestion des utilisateurs, services, configuration                    │
 * │  - Peut voir et modifier tous les tickets                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                           MANAGER                                       │
 * │  - Supervise l'équipe d'agents                                          │
 * │  - Voit les KPIs et statistiques                                        │
 * │  - Peut réassigner les tickets entre agents                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                           AGENT                                         │
 * │  - Traite les tickets qui lui sont assignés                             │
 * │  - Change les statuts, ajoute des commentaires                          │
 * │  - Voit uniquement ses tickets assignés                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                           CLIENT                                        │
 * │  - Crée des tickets de support                                          │
 * │  - Voit uniquement ses propres tickets                                  │
 * │  - Peut commenter et suivre l'avancement                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * UTILISATION DANS LE CODE:
 * -------------------------
 * 
 * // Dans une entité
 * @Enumerated(EnumType.STRING)
 * private UserRole role;
 * 
 * // Dans un controller
 * @PreAuthorize("hasRole('ADMIN')")
 * public void adminOnly() { ... }
 * 
 * // Dans la logique métier
 * if (user.getRole() == UserRole.MANAGER) { ... }
 * 
 * STOCKAGE EN BASE:
 * -----------------
 * Avec @Enumerated(EnumType.STRING), stocké comme texte:
 * "ADMIN", "MANAGER", "AGENT", "CLIENT"
 * 
 * ============================================================================
 */
public enum UserRole {
    
    /**
     * CLIENT - Utilisateur final qui crée des tickets.
     * 
     * PERMISSIONS:
     * - Créer des tickets de support
     * - Voir ses propres tickets uniquement
     * - Ajouter des commentaires à ses tickets
     * - Voir le suivi de ses demandes
     */
    CLIENT,
    
    /**
     * AGENT - Support technique qui traite les tickets.
     * 
     * PERMISSIONS:
     * - Voir les tickets qui lui sont assignés
     * - Changer le statut des tickets
     * - Ajouter des commentaires (publics et internes)
     * - Résoudre et clôturer les tickets
     */
    AGENT,
    
    /**
     * MANAGER - Superviseur d'équipe.
     * 
     * PERMISSIONS:
     * - Toutes les permissions d'AGENT
     * - Voir tous les tickets de l'équipe
     * - Assigner/réassigner des tickets aux agents
     * - Voir les KPIs et statistiques d'équipe
     * - Gérer les escalades
     */
    MANAGER,
    
    /**
     * ADMIN - Administrateur système.
     * 
     * PERMISSIONS:
     * - Accès complet à toutes les fonctionnalités
     * - Gestion des utilisateurs (création, modification, désactivation)
     * - Gestion des services télécom
     * - Gestion des clients entreprise
     * - Configuration du système
     * - Accès aux logs et audits
     */
    ADMIN
}
// =============================================================================
// FIN DE L'ENUM UserRole
// =============================================================================
