package com.billcom.mts.entity;

import com.billcom.mts.enums.ServiceCategory;
import com.billcom.mts.enums.ServiceCriticality;
import com.billcom.mts.enums.ServiceStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// =============================================================================
// ENTITÉ TELECOMSERVICE - Services télécom supervisés
// =============================================================================
/**
 * TelecomService - Entité représentant un service télécom supervisé par MTS.
 * 
 * RÔLE DE CETTE CLASSE:
 * Stocke les services télécoms que Billcom supervise pour ses clients.
 * Exemples: BSCS Billing, CRM Ericsson, Core Network, VoIP Platform
 * 
 * STATUTS:
 * - UP: Service opérationnel
 * - DEGRADED: Service dégradé (performances réduites)
 * - DOWN: Service en panne
 * - MAINTENANCE: Service en maintenance planifiée
 * 
 * Un changement de statut vers DOWN/DEGRADED déclenche des notifications
 * automatiques vers les admins et managers.
 * 
 * TABLE SQL:
 * CREATE TABLE services (
 *     id BIGINT PRIMARY KEY AUTO_INCREMENT,
 *     name VARCHAR(100) NOT NULL,
 *     category VARCHAR(20) NOT NULL,
 *     description TEXT,
 *     is_active BOOLEAN DEFAULT TRUE,
 *     status VARCHAR(20) DEFAULT 'UP',
 *     created_by BIGINT NOT NULL,
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     updated_at TIMESTAMP
 * );
 */
@Entity
@Table(name = "services", indexes = {
        @Index(name = "idx_service_name", columnList = "name"),
        @Index(name = "idx_service_category", columnList = "category"),
        @Index(name = "idx_service_is_active", columnList = "is_active"),
        @Index(name = "idx_service_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelecomService {

    // =========================================================================
    // CLÉ PRIMAIRE
    // =========================================================================
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // INFORMATIONS DU SERVICE
    // =========================================================================
    
    /**
     * Nom du service.
     * Ex: "BSCS Billing System", "CRM Ericsson"
     */
    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Catégorie du service.
     * 
     * IMPORTANT:
     * - DB column is VARCHAR(20)
     * - @Enumerated(EnumType.STRING) stores enum name (BILLING/CRM/...)
     * - @JdbcTypeCode forces Hibernate to treat it as VARCHAR (not native enum)
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private ServiceCategory category;

    /**
     * Description détaillée du service.
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Indique si le service est actif dans le système.
     * Un service inactif n'est plus visible dans la liste pour création de tickets.
     */
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /**
     * Statut opérationnel du service.
     * Indique si le service fonctionne normalement, est dégradé ou en panne.
     * 
     * WORKFLOW:
     * - UP: Fonctionnement normal
     * - DEGRADED: Problèmes détectés, performances réduites
     * - DOWN: Panne totale, service indisponible
     * - MAINTENANCE: Maintenance planifiée
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private ServiceStatus status = ServiceStatus.UP;

    /** KPI: disponibilité en % (ex: 99.95). */
    @Column(name = "availability_pct", precision = 5, scale = 2)
    private java.math.BigDecimal availabilityPct;

    /** KPI: latence moyenne en ms. */
    @Column(name = "avg_latency_ms")
    private Integer avgLatencyMs;

    /** KPI: temps moyen de rétablissement en minutes (MTTR). */
    @Column(name = "mttr_minutes")
    private Integer mttrMinutes;

    // =========================================================================
    // RELATIONS
    // =========================================================================
    
    /**
     * Utilisateur ayant créé le service.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /** Responsable du service (owner technique ou fonctionnel). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    /** Criticité business du service (CRITICAL, HIGH, MEDIUM, LOW). */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private ServiceCriticality criticality = ServiceCriticality.MEDIUM;

    /** Politique SLA associée au service. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sla_policy_id")
    private SlaConfig slaPolicy;

    /**
     * Tickets associés à ce service.
     */
    @OneToMany(mappedBy = "service", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Ticket> tickets = new ArrayList<>();

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
    
    /**
     * Vérifie si le service est opérationnel (UP ou DEGRADED).
     */
    public boolean isOperational() {
        return status == ServiceStatus.UP || status == ServiceStatus.DEGRADED;
    }

    /**
     * Vérifie si le service est en panne.
     */
    public boolean isDown() {
        return status == ServiceStatus.DOWN;
    }

    /**
     * Vérifie si le service nécessite une attention urgente.
     */
    public boolean needsAttention() {
        return status == ServiceStatus.DOWN || status == ServiceStatus.DEGRADED;
    }

    /**
     * Retourne le nombre de tickets ouverts sur ce service.
     */
    public long getOpenTicketCount() {
        if (tickets == null) return 0;
        return tickets.stream()
            .filter(t -> t.getStatus() != null && 
                        !t.getStatus().name().equals("RESOLVED") && 
                        !t.getStatus().name().equals("CLOSED"))
            .count();
    }
}
