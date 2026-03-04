package com.billcom.mts.entity;

import com.billcom.mts.enums.TicketPriority;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * EscalationRule — Règle d'escalade automatique configurable par Admin.
 *
 * Déclenche des actions lorsqu'un ticket atteint un seuil SLA :
 * - AT_RISK  (ex: 80% du temps consommé) → escalade niveau 1
 * - BREACHED (100% dépassé) → escalade niveau 2, notification managers
 *
 * Les règles sont évaluées par ordre de sortOrder croissant.
 */
@Entity
@Table(name = "escalation_rule", indexes = {
    @Index(name = "idx_escalation_trigger", columnList = "trigger_type, enabled")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class EscalationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nom descriptif de la règle */
    @Column(nullable = false, length = 150)
    private String name;

    /** Description longue */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Type de déclencheur : AT_RISK ou BREACHED.
     */
    @Column(name = "trigger_type", nullable = false, length = 30)
    private String triggerType;

    /**
     * Seuil en pourcentage du SLA consommé (ex: 80 pour AT_RISK).
     * NULL signifie 100% (= BREACHED).
     */
    @Column(name = "threshold_percent")
    private Integer thresholdPercent;

    /** Niveau d'escalade (1, 2, 3…) */
    @Column(name = "escalation_level", nullable = false)
    @Builder.Default
    private Integer escalationLevel = 1;

    /** (Optionnel) ID utilisateur à qui réassigner automatiquement */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auto_assign_to")
    private User autoAssignTo;

    /**
     * Rôles à notifier, séparés par virgule : "MANAGER,ADMIN"
     */
    @Column(name = "notify_roles", length = 100)
    private String notifyRoles;

    /**
     * (Optionnel) Nouvelle priorité à appliquer au ticket (ex: CRITICAL).
     */
    @Column(name = "change_priority", length = 20)
    private String changePriority;

    /** Règle active ou désactivée */
    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    /**
     * Filtre par priorité: si renseigné, la règle ne s'applique
     * qu'aux tickets de cette priorité.
     */
    @Column(name = "priority_filter", length = 20)
    private String priorityFilter;

    /** Ordre d'évaluation (croissant) */
    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // === Helpers ===

    /**
     * Vérifie si cette règle s'applique à la priorité donnée.
     */
    public boolean matchesPriority(TicketPriority priority) {
        if (priorityFilter == null || priorityFilter.isBlank()) return true;
        return priorityFilter.equalsIgnoreCase(priority.name());
    }
}
