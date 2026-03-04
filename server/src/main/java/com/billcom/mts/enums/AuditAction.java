// =============================================================================
// MTS TELECOM - AuditAction Enum
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================

package com.billcom.mts.enums;

/**
 * Enum représentant les différents types d'actions auditables dans le système.
 * 
 * Chaque action correspond à une opération métier traçable pour
 * la conformité, le debugging, et la sécurité.
 * 
 * CATÉGORIES:
 * - Tickets: création, modification, assignation, statut, commentaires
 * - Services: création, modification, changement statut
 * - Incidents: création, modification, résolution
 * - SLA: création/modification des politiques, escalades
 * - Administration: gestion utilisateurs, configuration
 * 
 * @author Billcom Consulting
 * @version 1.0
 * @since 2026-02-28
 */
public enum AuditAction {
    
    // =========================================================================
    // TICKETS
    // =========================================================================
    
    /**
     * Création d'un nouveau ticket.
     * Loggé: title, priority, description, client
     */
    TICKET_CREATED("Ticket créé", "Tickets"),
    
    /**
     * Modification des informations du ticket.
     * Loggé: champs modifiés avec anciennes/nouvelles valeurs
     */
    TICKET_UPDATED("Ticket mis à jour", "Tickets"),
    
    /**
     * Suppression d'un ticket (ADMIN uniquement).
     * Loggé: toutes les infos du ticket supprimé
     */
    TICKET_DELETED("Ticket supprimé", "Tickets"),
    
    /**
     * Assignation ou réassignation du ticket à un agent.
     * Loggé: ancien agent → nouvel agent
     */
    TICKET_ASSIGNED("Ticket assigné", "Tickets"),
    
    /**
     * Changement de statut du ticket.
     * Loggé: ancien statut → nouveau statut
     */
    TICKET_STATUS_CHANGED("Statut modifié", "Tickets"),
    
    /**
     * Changement de priorité du ticket.
     * Loggé: ancienne priorité → nouvelle priorité
     */
    TICKET_PRIORITY_CHANGED("Priorité modifiée", "Tickets"),
    
    /**
     * Ajout d'un commentaire au ticket.
     * Loggé: auteur, contenu du commentaire
     */
    TICKET_COMMENT_ADDED("Commentaire ajouté", "Tickets"),
    
    /**
     * Escalade automatique du ticket (SLA dépassé).
     * Loggé: niveau d'escalade, manager assigné
     */
    TICKET_ESCALATED("Ticket escaladé", "Tickets"),
    
    /**
     * Clôture du ticket.
     * Loggé: raison de clôture, solution appliquée
     */
    TICKET_CLOSED("Ticket clôturé", "Tickets"),
    
    /**
     * Réouverture d'un ticket clôturé.
     * Loggé: raison de réouverture
     */
    TICKET_REOPENED("Ticket réouvert", "Tickets"),
    
    // =========================================================================
    // CLIENTS
    // =========================================================================
    
    /**
     * Création d'un nouveau client.
     * Loggé: companyName, email, contactName
     */
    CLIENT_CREATED("Client créé", "Clients"),
    
    /**
     * Modification des informations client.
     * Loggé: champs modifiés
     */
    CLIENT_UPDATED("Client mis à jour", "Clients"),
    
    /**
     * Suppression d'un client.
     * Loggé: toutes les infos du client
     */
    CLIENT_DELETED("Client supprimé", "Clients"),
    
    // =========================================================================
    // SERVICES TÉLÉCOM
    // =========================================================================
    
    /**
     * Création d'un nouveau service.
     * Loggé: serviceType, name, client
     */
    SERVICE_CREATED("Service créé", "Services"),
    
    /**
     * Modification des informations du service.
     * Loggé: champs modifiés
     */
    SERVICE_UPDATED("Service mis à jour", "Services"),
    
    /**
     * Suppression d'un service.
     * Loggé: toutes les infos du service
     */
    SERVICE_DELETED("Service supprimé", "Services"),
    
    /**
     * Changement de statut du service (UP, DOWN, DEGRADED).
     * Loggé: ancien statut → nouveau statut
     */
    SERVICE_STATUS_CHANGED("Statut service modifié", "Services"),
    
    // =========================================================================
    // INCIDENTS
    // =========================================================================
    
    /**
     * Déclaration d'un nouvel incident.
     * Loggé: titre, service affecté, sévérité
     */
    INCIDENT_CREATED("Incident créé", "Incidents"),
    
    /**
     * Modification des informations de l'incident.
     * Loggé: champs modifiés
     */
    INCIDENT_UPDATED("Incident mis à jour", "Incidents"),
    
    /**
     * Suppression d'un incident.
     * Loggé: toutes les infos de l'incident
     */
    INCIDENT_DELETED("Incident supprimé", "Incidents"),
    
    /**
     * Résolution de l'incident.
     * Loggé: solution appliquée, durée de résolution
     */
    INCIDENT_RESOLVED("Incident résolu", "Incidents"),
    
    /**
     * Escalade de l'incident.
     * Loggé: niveau d'escalade, équipe assignée
     */
    INCIDENT_ESCALATED("Incident escaladé", "Incidents"),
    
    // =========================================================================
    // SLA & ESCALADE
    // =========================================================================
    
    /**
     * Création d'une nouvelle politique SLA.
     * Loggé: nom, temps de réponse, temps de résolution
     */
    SLA_POLICY_CREATED("Politique SLA créée", "SLA"),
    
    /**
     * Modification d'une politique SLA.
     * Loggé: champs modifiés
     */
    SLA_POLICY_UPDATED("Politique SLA modifiée", "SLA"),
    
    /**
     * Suppression d'une politique SLA.
     * Loggé: toutes les infos de la politique
     */
    SLA_POLICY_DELETED("Politique SLA supprimée", "SLA"),
    
    /**
     * Escalade automatique déclenchée.
     * Loggé: ticket, niveau, règle SLA
     */
    SLA_ESCALATION_TRIGGERED("Escalade SLA déclenchée", "SLA"),
    
    /**
     * Escalade résolue/annulée.
     * Loggé: raison de résolution
     */
    SLA_ESCALATION_RESOLVED("Escalade SLA résolue", "SLA"),
    
    /**
     * Création d'une règle d'escalade.
     * Loggé: nom, trigger, seuil, niveau
     */
    ESCALATION_RULE_CREATED("Règle d'escalade créée", "SLA"),

    /**
     * Modification d'une règle d'escalade.
     * Loggé: champs modifiés
     */
    ESCALATION_RULE_UPDATED("Règle d'escalade modifiée", "SLA"),

    /**
     * Suppression d'une règle d'escalade.
     * Loggé: infos de la règle supprimée
     */
    ESCALATION_RULE_DELETED("Règle d'escalade supprimée", "SLA"),

    /**
     * Création d'un horaire ouvré.
     * Loggé: nom, heures, jours ouvrés
     */
    BUSINESS_HOURS_CREATED("Heures ouvrées créées", "SLA"),

    /**
     * Modification des heures ouvrées.
     * Loggé: anciennes heures → nouvelles heures
     */
    BUSINESS_HOURS_UPDATED("Heures ouvrées modifiées", "SLA"),

    /**
     * Suppression d'un horaire ouvré.
     * Loggé: infos supprimées
     */
    BUSINESS_HOURS_DELETED("Heures ouvrées supprimées", "SLA"),
    
    // =========================================================================
    // RAPPORTS
    // =========================================================================
    
    /**
     * Génération d'un nouveau rapport.
     * Loggé: type de rapport, période, filtres
     */
    REPORT_GENERATED("Rapport généré", "Rapports"),
    
    /**
     * Téléchargement d'un rapport (PDF/CSV).
     * Loggé: format, utilisateur
     */
    REPORT_DOWNLOADED("Rapport téléchargé", "Rapports"),
    
    /**
     * Suppression d'un rapport.
     * Loggé: infos du rapport supprimé
     */
    REPORT_DELETED("Rapport supprimé", "Rapports"),
    
    // =========================================================================
    // UTILISATEURS & ADMINISTRATION
    // =========================================================================
    
    /**
     * Création d'un nouvel utilisateur.
     * Loggé: email, role, fullName
     */
    USER_CREATED("Utilisateur créé", "Administration"),
    
    /**
     * Modification des informations utilisateur.
     * Loggé: champs modifiés
     */
    USER_UPDATED("Utilisateur mis à jour", "Administration"),
    
    /**
     * Suppression d'un utilisateur.
     * Loggé: toutes les infos de l'utilisateur
     */
    USER_DELETED("Utilisateur supprimé", "Administration"),
    
    /**
     * Changement de rôle utilisateur.
     * Loggé: ancien rôle → nouveau rôle
     */
    USER_ROLE_CHANGED("Rôle utilisateur modifié", "Administration"),
    
    /**
     * Activation d'un utilisateur désactivé.
     * Loggé: raison d'activation
     */
    USER_ACTIVATED("Utilisateur activé", "Administration"),
    
    /**
     * Désactivation d'un utilisateur actif.
     * Loggé: raison de désactivation
     */
    USER_DEACTIVATED("Utilisateur désactivé", "Administration"),
    
    /**
     * Changement de mot de passe.
     * Loggé: utilisateur, IP (pas le mot de passe!)
     */
    USER_PASSWORD_CHANGED("Mot de passe modifié", "Sécurité"),
    
    /**
     * Échec de connexion.
     * Loggé: email, IP, raison
     */
    LOGIN_FAILED("Échec de connexion", "Sécurité"),
    
    /**
     * Connexion réussie.
     * Loggé: utilisateur, IP, user-agent
     */
    LOGIN_SUCCESS("Connexion réussie", "Sécurité"),
    
    /**
     * Déconnexion.
     * Loggé: utilisateur, durée de session
     */
    LOGOUT("Déconnexion", "Sécurité"),
    
    // =========================================================================
    // CONFIGURATION SYSTÈME
    // =========================================================================
    
    /**
     * Modification de la configuration système.
     * Loggé: paramètre modifié, ancienne/nouvelle valeur
     */
    SYSTEM_CONFIG_UPDATED("Configuration système modifiée", "Système"),
    
    /**
     * Export de données.
     * Loggé: type de données, format, volume
     */
    DATA_EXPORTED("Données exportées", "Système"),
    
    /**
     * Import de données.
     * Loggé: type de données, format, volume
     */
    DATA_IMPORTED("Données importées", "Système");
    
    // =========================================================================
    // ATTRIBUTS
    // =========================================================================
    
    /**
     * Label français de l'action (pour affichage UI).
     */
    private final String label;
    
    /**
     * Catégorie de l'action (pour regroupement/filtrage).
     */
    private final String category;
    
    // =========================================================================
    // CONSTRUCTEUR
    // =========================================================================
    
    /**
     * Constructeur privé de l'enum.
     * 
     * @param label    Label français de l'action
     * @param category Catégorie de l'action
     */
    AuditAction(String label, String category) {
        this.label = label;
        this.category = category;
    }
    
    // =========================================================================
    // GETTERS
    // =========================================================================
    
    /**
     * Retourne le label français de l'action.
     * 
     * @return Label de l'action
     */
    public String getLabel() {
        return label;
    }
    
    /**
     * Retourne la catégorie de l'action.
     * 
     * @return Catégorie de l'action
     */
    public String getCategory() {
        return category;
    }
    
    // =========================================================================
    // MÉTHODES UTILITAIRES
    // =========================================================================
    
    /**
     * Vérifie si l'action concerne les tickets.
     * 
     * @return true si action liée aux tickets
     */
    public boolean isTicketRelated() {
        return this.name().startsWith("TICKET_");
    }
    
    /**
     * Vérifie si l'action concerne les services.
     * 
     * @return true si action liée aux services
     */
    public boolean isServiceRelated() {
        return this.name().startsWith("SERVICE_");
    }
    
    /**
     * Vérifie si l'action concerne les incidents.
     * 
     * @return true si action liée aux incidents
     */
    public boolean isIncidentRelated() {
        return this.name().startsWith("INCIDENT_");
    }
    
    /**
     * Vérifie si l'action concerne le SLA.
     * 
     * @return true si action liée au SLA
     */
    public boolean isSlaRelated() {
        return this.name().startsWith("SLA_") || this.name().startsWith("BUSINESS_HOURS_");
    }
    
    /**
     * Vérifie si l'action concerne l'administration.
     * 
     * @return true si action administrative
     */
    public boolean isAdminAction() {
        return this.category.equals("Administration") || this.category.equals("Système");
    }
    
    /**
     * Vérifie si l'action concerne la sécurité.
     * 
     * @return true si action de sécurité
     */
    public boolean isSecurityAction() {
        return this.category.equals("Sécurité");
    }
}
