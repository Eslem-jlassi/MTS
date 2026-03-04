package com.billcom.mts.entity;

import com.billcom.mts.enums.IncidentTimelineEventType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Événement de la timeline d'un incident.
 * Trace l'historique complet : changements de statut, notes, post-mortem, liaisons tickets/services.
 */
@Entity
@Table(name = "incident_timeline", indexes = {
    @Index(name = "idx_it_incident_date", columnList = "incident_id, created_at DESC")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentTimeline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "event_type", nullable = false, length = 30)
    private IncidentTimelineEventType eventType;

    /** Contenu de l'événement (note, description de la mise à jour, etc.). */
    @Column(columnDefinition = "TEXT")
    private String content;

    /** Ancienne valeur (pour les changements de statut par ex.). */
    @Column(name = "old_value", length = 100)
    private String oldValue;

    /** Nouvelle valeur. */
    @Column(name = "new_value", length = 100)
    private String newValue;

    /** Auteur de l'événement. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
