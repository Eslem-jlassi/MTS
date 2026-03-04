package com.billcom.mts.entity;

import com.billcom.mts.enums.TicketPriority;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * SlaConfig – Politique SLA (Service Level Agreement) par priorité et optionnellement par service.
 * <p>
 * Chaque entrée définit les délais SLA pour une priorité donnée :
 * - {@code responseTimeHours} : délai maximum de première réponse
 * - {@code slaHours} : délai maximum de résolution
 * <p>
 * Phase 3 (création) → Phase 10 (ajout nom, description, active, response_time_hours)
 */
@Entity
@Table(name = "sla_config", uniqueConstraints = @UniqueConstraint(columnNames = { "priority", "service_id" }))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nom lisible de la politique SLA (ex: "Critique - Mission Critical") */
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    /** Description détaillée de la politique */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** Priorité du ticket concerné par cette politique */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private TicketPriority priority;

    /** Service spécifique (null = politique globale pour la priorité) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private TelecomService service;

    /** Délai maximum de résolution en heures */
    @Column(name = "sla_hours", nullable = false)
    private Integer slaHours;

    /** Délai maximum de première réponse en heures */
    @Column(name = "response_time_hours")
    private Integer responseTimeHours;

    /**
     * Horaires ouvrés associés (null = calcul 24/7).
     * Si renseigné, le SLA est calculé uniquement sur les heures ouvrées.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_hours_id")
    private BusinessHours businessHours;

    /** La politique est-elle active ? (on peut désactiver sans supprimer) */
    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
