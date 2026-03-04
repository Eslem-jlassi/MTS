package com.billcom.mts.entity;

import com.billcom.mts.enums.IncidentImpact;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.Severity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Incident de supervision lié à un service principal,
 * pouvant regrouper plusieurs tickets et affecter plusieurs services.
 */
@Entity
@Table(name = "incidents", indexes = {
    @Index(name = "idx_incident_service", columnList = "service_id"),
    @Index(name = "idx_incident_status", columnList = "status"),
    @Index(name = "idx_incident_started", columnList = "started_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Numéro unique d'incident (INC-00001). */
    @Column(name = "incident_number", nullable = false, unique = true, length = 30)
    private String incidentNumber;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String title;

    /** Description détaillée de l'incident. */
    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private Severity severity;

    /** Impact business de l'incident. */
    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private IncidentImpact impact = IncidentImpact.LOCALIZED;

    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private IncidentStatus status = IncidentStatus.OPEN;

    /** Service principal de l'incident. */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private TelecomService service;

    /** Ticket legacy (rétro-compatibilité, lien direct simple). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    /** Commandant d'incident (responsable de la résolution). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commander_id")
    private User commander;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(columnDefinition = "TEXT")
    private String cause;

    /** Rapport post-mortem / Root Cause Analysis (RCA). */
    @Column(name = "post_mortem", columnDefinition = "TEXT")
    private String postMortem;

    @Column(name = "post_mortem_at")
    private LocalDateTime postMortemAt;

    // =========================================================================
    // RELATIONS MANY-TO-MANY
    // =========================================================================

    /** Tickets regroupés sous cet incident. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "incident_tickets",
        joinColumns = @JoinColumn(name = "incident_id"),
        inverseJoinColumns = @JoinColumn(name = "ticket_id")
    )
    @Builder.Default
    private Set<Ticket> tickets = new HashSet<>();

    /** Services affectés (en dehors du service principal). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "incident_services",
        joinColumns = @JoinColumn(name = "incident_id"),
        inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    @Builder.Default
    private Set<TelecomService> affectedServices = new HashSet<>();

    /** Timeline de l'incident (événements, notes, etc.). */
    @OneToMany(mappedBy = "incident", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<IncidentTimeline> timeline = new ArrayList<>();

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
    // MÉTHODES UTILITAIRES
    // =========================================================================

    public boolean isActive() {
        return status == IncidentStatus.OPEN || status == IncidentStatus.IN_PROGRESS;
    }

    public boolean isResolved() {
        return status == IncidentStatus.RESOLVED || status == IncidentStatus.CLOSED;
    }

    public boolean hasPostMortem() {
        return postMortem != null && !postMortem.isBlank();
    }
}
