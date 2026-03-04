package com.billcom.mts.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * SlaTimeline — Historique immuable des événements SLA sur un ticket.
 *
 * Chaque changement d'état SLA (démarré, pausé, repris, à risque, dépassé,
 * escaladé, deadline modifiée) est tracé ici pour audit complet.
 */
@Entity
@Table(name = "sla_timeline", indexes = {
    @Index(name = "idx_sla_timeline_ticket", columnList = "ticket_id"),
    @Index(name = "idx_sla_timeline_type", columnList = "event_type")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SlaTimeline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Ticket concerné */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    /**
     * Type d'événement SLA.
     * Valeurs possibles : STARTED, PAUSED, RESUMED, BREACHED, AT_RISK,
     *                      ESCALATED, DEADLINE_CHANGED
     */
    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    /** Ancienne valeur (ex: ancien deadline, ancien SLA %) */
    @Column(name = "old_value", length = 255)
    private String oldValue;

    /** Nouvelle valeur */
    @Column(name = "new_value", length = 255)
    private String newValue;

    /** Détails textuels */
    @Column(columnDefinition = "TEXT")
    private String details;

    /** Total minutes de pause au moment de l'événement */
    @Column(name = "paused_minutes")
    private Long pausedMinutes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
}
