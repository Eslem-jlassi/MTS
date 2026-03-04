package com.billcom.mts.entity;

// =============================================================================
// IMPORTS - Bibliothèques nécessaires pour l'entité Ticket
// =============================================================================

// Enums du projet - Valeurs prédéfinies pour catégorie, priorité, statut
import com.billcom.mts.enums.TicketCategory;    // PANNE, RECLAMATION, DEMANDE_INFO, etc.
import com.billcom.mts.enums.TicketPriority;    // CRITICAL, HIGH, MEDIUM, LOW
import com.billcom.mts.enums.TicketStatus;      // NEW, OPEN, IN_PROGRESS, RESOLVED, CLOSED

// JPA - Mapping objet-relationnel
import jakarta.persistence.*;

// Validation - Contraintes sur les données
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// Lombok - Génération automatique de code
import lombok.*;

// Hibernate - Timestamps automatiques
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// =============================================================================
// ENTITÉ TICKET - Table principale de gestion des incidents
// =============================================================================
/**
 * ============================================================================
 * Ticket - Entité représentant un ticket de support
 * ============================================================================
 * 
 * RÔLE DE CETTE CLASSE:
 * C'est l'entité CENTRALE du système de gestion des tickets.
 * Elle représente une demande de support créée par un client.
 * 
 * CYCLE DE VIE D'UN TICKET:
 * 1. NEW (Nouveau) → Client crée le ticket
 * 2. OPEN (Ouvert) → Ticket en attente d'assignation
 * 3. IN_PROGRESS (En cours) → Agent travaille dessus
 * 4. PENDING (En attente) → Attente d'info du client
 * 5. RESOLVED (Résolu) → Solution trouvée
 * 6. CLOSED (Fermé) → Ticket terminé
 * 
 * GESTION DU SLA (Service Level Agreement):
 * - Chaque ticket a un délai de résolution (deadline)
 * - Le délai dépend de la priorité (CRITICAL = 4h, LOW = 48h)
 * - Si deadline dépassée → breachedSla = true
 * 
 * RELATIONS:
 * - Client (Many-to-One): Le client qui a créé le ticket
 * - TelecomService (Many-to-One): Le service télécom concerné
 * - User assignedTo (Many-to-One): L'agent assigné
 * - User createdBy (Many-to-One): L'utilisateur qui a créé
 * - TicketComment (One-to-Many): Les commentaires
 * - TicketHistory (One-to-Many): L'historique des modifications
 * 
 * ============================================================================
 */
@Entity
@Table(name = "tickets", indexes = {
    // INDEX: Optimisent les recherches fréquentes
    @Index(name = "idx_ticket_number", columnList = "ticketNumber"),    // Recherche par numéro
    @Index(name = "idx_ticket_status", columnList = "status"),          // Filtrer par statut
    @Index(name = "idx_ticket_priority", columnList = "priority"),      // Filtrer par priorité
    @Index(name = "idx_ticket_client_id", columnList = "client_id"),    // Tickets d'un client
    @Index(name = "idx_ticket_assigned_to", columnList = "assigned_to"),// Tickets d'un agent
    @Index(name = "idx_ticket_deadline", columnList = "deadline"),      // Tri par deadline
    @Index(name = "idx_ticket_breached_sla", columnList = "breachedSla")// Filtrer les SLA dépassés
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    // =========================================================================
    // CLÉ PRIMAIRE
    // =========================================================================
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // IDENTIFICATION DU TICKET
    // =========================================================================
    
    /**
     * Numéro unique du ticket (visible par l'utilisateur).
     * 
     * Format: TKT-2024-001234
     * Généré automatiquement lors de la création.
     * Utilisé pour référencer le ticket dans les communications.
     */
    @NotBlank
    @Size(max = 20)
    @Column(name = "ticket_number", unique = true, nullable = false, length = 20)
    private String ticketNumber;

    /**
     * Titre résumant le problème (max 200 caractères).
     * Exemple: "Connexion Internet instable depuis 2 jours"
     */
    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String title;

    /**
     * Description détaillée du problème.
     * 
     * TEXT: Type SQL pour les textes longs (jusqu'à 65535 caractères)
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    // =========================================================================
    // RELATIONS AVEC D'AUTRES ENTITÉS
    // =========================================================================

    /**
     * Client qui a créé le ticket.
     * 
     * @ManyToOne: Plusieurs tickets peuvent appartenir à un client
     * LAZY: Ne charge pas le client automatiquement (performance)
     * @JoinColumn: Crée la colonne "client_id" comme clé étrangère
     */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /**
     * Service télécom concerné par le ticket.
     * 
     * Ex: "Fibre Pro 100 Mbps", "Téléphonie VoIP"
     */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private TelecomService service;

    /**
     * Agent assigné au traitement du ticket.
     * 
     * Peut être null si le ticket n'est pas encore assigné.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    /**
     * Utilisateur qui a créé le ticket (généralement le client).
     */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // =========================================================================
    // CLASSIFICATION DU TICKET
    // =========================================================================

    /**
     * Catégorie du ticket.
     * 
     * Valeurs possibles (TicketCategory enum):
     * - PANNE: Panne technique
     * - RECLAMATION: Réclamation client
     * - DEMANDE_INFO: Demande d'information
     * - CHANGEMENT_OFFRE: Changement d'offre
     * - RESILIATION: Résiliation de service
     * 
     * @Builder.Default: Valeur par défaut = PANNE
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TicketCategory category = TicketCategory.PANNE;

    /**
     * Priorité du ticket.
     * 
     * Valeurs possibles (TicketPriority enum):
     * - CRITICAL: SLA 4h (urgence maximale)
     * - HIGH: SLA 8h (haute priorité)
     * - MEDIUM: SLA 24h (priorité normale)
     * - LOW: SLA 48h (basse priorité)
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TicketPriority priority = TicketPriority.MEDIUM;

    /**
     * Statut actuel du ticket.
     * 
     * Voir cycle de vie en haut du fichier.
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TicketStatus status = TicketStatus.NEW;

    // =========================================================================
    // GESTION DU SLA (Service Level Agreement)
    // =========================================================================

    /**
     * Nombre d'heures allouées pour résoudre le ticket.
     * 
     * Déterminé par la priorité (ex: CRITICAL = 4, LOW = 48)
     */
    @Column(name = "sla_hours", nullable = false)
    private Integer slaHours;

    /**
     * Date limite de résolution.
     * 
     * Calculée: createdAt + slaHours
     * Si dépassée, le ticket est en violation de SLA
     */
    @Column(nullable = false)
    private LocalDateTime deadline;

    /**
     * Date de résolution effective (quand status passe à RESOLVED).
     */
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    /**
     * Date de clôture (quand status passe à CLOSED).
     */
    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    /**
     * Description de la solution apportée.
     */
    @Column(columnDefinition = "TEXT")
    private String resolution;

    /**
     * Cause racine identifiée (analyse post-résolution).
     */
    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    /**
     * Catégorie finale du ticket (peut différer de la catégorie initiale après analyse).
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "final_category", length = 20)
    private TicketCategory finalCategory;

    /**
     * Temps passé sur le ticket en minutes (saisie agent).
     */
    @Column(name = "time_spent_minutes")
    private Integer timeSpentMinutes;

    /**
     * Impact métier (ex: faible, moyen, critique).
     */
    @Size(max = 50)
    @Column(name = "impact", length = 50)
    private String impact;

    /**
     * Indique si le SLA a été violé (deadline dépassée).
     * 
     * Important pour les KPIs et rapports de performance.
     */
    @Builder.Default
    @Column(name = "breached_sla", nullable = false)
    private Boolean breachedSla = false;

    /** Dernière fois qu'une alerte SLA "à risque" a été envoyée (évite spam). */
    @Column(name = "sla_warning_notified_at")
    private LocalDateTime slaWarningNotifiedAt;

    // =========================================================================
    // PAUSE SLA & ESCALADE
    // =========================================================================

    /**
     * Instant où le SLA a été pausé (statut PENDING).
     * NULL si le SLA n'est pas en pause.
     */
    @Column(name = "sla_paused_at")
    private LocalDateTime slaPausedAt;

    /**
     * Total cumulé des minutes de pause SLA.
     * Ajouté à chaque reprise (PENDING → IN_PROGRESS).
     */
    @Builder.Default
    @Column(name = "sla_paused_minutes", nullable = false)
    private Long slaPausedMinutes = 0L;

    /**
     * Niveau d'escalade atteint (0 = aucun, 1 = premier niveau, 2 = deuxième…).
     */
    @Builder.Default
    @Column(name = "escalation_level", nullable = false)
    private Integer escalationLevel = 0;

    // =========================================================================
    // TIMESTAMPS
    // =========================================================================

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // =========================================================================
    // COLLECTIONS (Relations One-to-Many)
    // =========================================================================

    /**
     * Liste des commentaires sur le ticket.
     * 
     * mappedBy = "ticket": Le champ "ticket" dans TicketComment possède la relation
     * cascade = ALL: Si on supprime le ticket, on supprime les commentaires
     * orphanRemoval = true: Si on retire un commentaire de la liste, il est supprimé
     * @OrderBy: Trie par date décroissante (plus récent en premier)
     */
    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<TicketComment> comments = new ArrayList<>();

    /**
     * Historique des modifications du ticket.
     * 
     * Trace toutes les actions: changement de statut, assignation, etc.
     */
    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<TicketHistory> history = new ArrayList<>();

    /**
     * Pièces jointes du ticket.
     */
    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<TicketAttachment> attachments = new ArrayList<>();

    // =========================================================================
    // MÉTHODES DE CYCLE DE VIE JPA
    // =========================================================================

    /**
     * Méthode exécutée automatiquement AVANT l'insertion en BDD.
     * 
     * @PrePersist: Annotation JPA qui déclenche cette méthode avant persist()
     * 
     * Permet d'initialiser des valeurs calculées automatiquement:
     * - slaHours basé sur la priorité
     * - deadline basée sur slaHours
     */
    @PrePersist
    public void prePersist() {
        // Si slaHours n'est pas défini mais qu'on a une priorité
        // → On récupère le SLA de la priorité
        if (slaHours == null && priority != null) {
            slaHours = priority.getSlaHours();
        }
        // Si deadline n'est pas défini mais qu'on a slaHours
        // → On calcule: maintenant + slaHours
        if (deadline == null && slaHours != null) {
            deadline = LocalDateTime.now().plusHours(slaHours);
        }
    }

    // =========================================================================
    // MÉTHODES UTILITAIRES POUR LE SLA
    // =========================================================================

    /**
     * Vérifie si le ticket est en retard (SLA dépassé).
     * 
     * LOGIQUE:
     * - Si le ticket est CLOSED ou RESOLVED → on regarde breachedSla (historique)
     * - Sinon → on compare l'heure actuelle avec la deadline
     * 
     * @return true si le SLA est dépassé
     */
    public boolean isOverdue() {
        // Pour les tickets fermés, on utilise la valeur historique
        if (status == TicketStatus.CLOSED || status == TicketStatus.RESOLVED) {
            return breachedSla;
        }
        // Pour les tickets actifs, on compare avec maintenant
        return LocalDateTime.now().isAfter(deadline);
    }

    /**
     * Calcule le pourcentage du SLA consommé, en tenant compte des pauses.
     * 
     * FORMULE: ((temps écoulé - temps pausé) / temps total) * 100
     * Si le SLA est actuellement en pause, on exclut le temps de pause courant.
     * 
     * @return Pourcentage entre 0 et 100
     */
    public double getSlaPercentageUsed() {
        if (slaHours == null || slaHours <= 0) {
            return 0;
        }
        long totalElapsed = java.time.Duration.between(createdAt, LocalDateTime.now()).toMinutes();
        long pausedMins = slaPausedMinutes != null ? slaPausedMinutes : 0;
        // Si on est actuellement en pause, ajouter le temps de pause courant
        if (slaPausedAt != null) {
            pausedMins += java.time.Duration.between(slaPausedAt, LocalDateTime.now()).toMinutes();
        }
        long effectiveElapsed = totalElapsed - pausedMins;
        long totalMinutes = slaHours * 60L;
        return Math.min(100.0, Math.max(0, (effectiveElapsed * 100.0) / totalMinutes));
    }

    /**
     * Calcule le nombre de minutes SLA restantes (en tenant compte des pauses).
     * Retourne un nombre négatif si le SLA est dépassé.
     */
    public long getSlaRemainingMinutes() {
        if (slaHours == null || slaHours <= 0) return 0;
        long totalMinutes = slaHours * 60L;
        long totalElapsed = java.time.Duration.between(createdAt, LocalDateTime.now()).toMinutes();
        long pausedMins = slaPausedMinutes != null ? slaPausedMinutes : 0;
        if (slaPausedAt != null) {
            pausedMins += java.time.Duration.between(slaPausedAt, LocalDateTime.now()).toMinutes();
        }
        return totalMinutes - (totalElapsed - pausedMins);
    }

    /**
     * Indicateur "à risque" : moins de 20 % du temps SLA restant.
     */
    public boolean isSlaAtRisk() {
        return getSlaPercentageUsed() >= 80 && !isOverdue();
    }

    /**
     * Vérifie si le ticket est en zone d'avertissement SLA.
     * 
     * Zone d'avertissement = plus de 75% du SLA consommé mais pas encore dépassé.
     * Utile pour alerter les agents avant qu'il ne soit trop tard.
     * 
     * @return true si entre 75% et 100% du SLA
     */
    public boolean isSlaWarning() {
        return getSlaPercentageUsed() >= 75 && !isOverdue();
    }

    // =========================================================================
    // MÉTHODES DE GESTION DES COLLECTIONS
    // =========================================================================

    /**
     * Ajoute un commentaire au ticket.
     * 
     * Maintient la relation bidirectionnelle:
     * - Ajoute le commentaire à la liste du ticket
     * - Définit le ticket sur le commentaire
     * 
     * @param comment Le commentaire à ajouter
     */
    public void addComment(TicketComment comment) {
        comments.add(comment);
        comment.setTicket(this);  // Maintient la relation bidirectionnelle
    }

    /**
     * Ajoute une entrée dans l'historique du ticket.
     * 
     * @param entry L'entrée d'historique à ajouter
     */
    public void addHistoryEntry(TicketHistory entry) {
        history.add(entry);
        entry.setTicket(this);  // Maintient la relation bidirectionnelle
    }
}
