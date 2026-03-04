package com.billcom.mts.entity;

// =============================================================================
// IMPORTS
// =============================================================================
import com.billcom.mts.enums.ReportSource;
import com.billcom.mts.enums.ReportType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;

// =============================================================================
// ENTITÉ REPORT - Table des rapports PDF
// =============================================================================
/**
 * Report - Entité représentant un rapport uploadé par un manager.
 * 
 * RÔLE DE CETTE CLASSE:
 * Stocke les métadonnées des rapports PDF uploadés.
 * Les managers peuvent créer des rapports périodiques (mensuel, trimestriel...)
 * et les partager avec l'équipe.
 * 
 * FLUX D'UTILISATION:
 * 1. Manager génère un rapport (externe ou manuellement)
 * 2. Manager upload le PDF via l'interface
 * 3. Le système stocke le fichier et crée une entrée Report
 * 4. Les utilisateurs autorisés peuvent consulter et télécharger
 * 
 * STOCKAGE DES FICHIERS:
 * - Le PDF est stocké sur le serveur dans un dossier dédié
 * - filePath contient le chemin relatif vers le fichier
 * - La sécurité d'accès est gérée par le contrôleur
 * 
 * TABLE SQL:
 * CREATE TABLE reports (
 *     id BIGINT PRIMARY KEY AUTO_INCREMENT,
 *     title VARCHAR(200) NOT NULL,
 *     description TEXT,
 *     report_type VARCHAR(50) NOT NULL,
 *     period_start DATE NOT NULL,
 *     period_end DATE NOT NULL,
 *     file_name VARCHAR(255) NOT NULL,
 *     file_path VARCHAR(500) NOT NULL,
 *     file_size BIGINT DEFAULT 0,
 *     mime_type VARCHAR(100) DEFAULT 'application/pdf',
 *     service_id BIGINT,
 *     created_by BIGINT NOT NULL,
 *     download_count INT DEFAULT 0,
 *     is_published BOOLEAN DEFAULT FALSE,
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     updated_at TIMESTAMP
 * );
 */
@Entity
@Table(name = "reports", indexes = {
    @Index(name = "idx_report_type", columnList = "report_type"),
    @Index(name = "idx_report_period", columnList = "period_start, period_end"),
    @Index(name = "idx_report_service", columnList = "service_id"),
    @Index(name = "idx_report_created_by", columnList = "created_by"),
    @Index(name = "idx_report_created_at", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Report {

    // =========================================================================
    // CLÉ PRIMAIRE
    // =========================================================================
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // MÉTADONNÉES DU RAPPORT
    // =========================================================================
    
    /**
     * Titre du rapport.
     * Ex: "Rapport mensuel - Février 2026"
     */
    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String title;

    /**
     * Description détaillée du contenu du rapport.
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Résumé exécutif généré automatiquement (KPI, alertes SLA, backlog).
     * V29 – Executive Summary.
     */
    @Column(name = "executive_summary", columnDefinition = "TEXT")
    private String executiveSummary;

    /**
     * Type de rapport (périodicité).
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "report_type", nullable = false, length = 50)
    private ReportType reportType;

    // =========================================================================
    // PÉRIODE COUVERTE
    // =========================================================================
    
    /**
     * Date de début de la période couverte par le rapport.
     */
    @NotNull
    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    /**
     * Date de fin de la période couverte par le rapport.
     */
    @NotNull
    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    // =========================================================================
    // FICHIER
    // =========================================================================
    
    /**
     * Nom original du fichier uploadé.
     * Ex: "rapport_février_2026.pdf"
     */
    @NotBlank
    @Size(max = 255)
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    /**
     * Chemin de stockage du fichier sur le serveur.
     * Ex: "uploads/reports/2026/02/abc123.pdf"
     */
    @NotBlank
    @Size(max = 500)
    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    /**
     * Taille du fichier en octets.
     */
    @Builder.Default
    @Column(name = "file_size", nullable = false)
    private Long fileSize = 0L;

    /**
     * Type MIME du fichier.
     */
    @Builder.Default
    @Size(max = 100)
    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType = "application/pdf";

    /**
     * Format de sortie: PDF ou CSV.
     * V29 – export multi-format.
     */
    @Builder.Default
    @Size(max = 10)
    @Column(name = "format", nullable = false, length = 10)
    private String format = "PDF";

    // =========================================================================
    // ASSOCIATIONS
    // =========================================================================
    
    /**
     * Service concerné par le rapport (optionnel).
     * Un rapport peut être global (service = null) ou spécifique à un service.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private TelecomService service;

    /**
     * Filtre service utilisé lors de la génération (V29).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_filter_id")
    private TelecomService serviceFilter;

    /**
     * Filtre équipe utilisé lors de la génération (V29).
     */
    @Size(max = 200)
    @Column(name = "team_filter", length = 200)
    private String teamFilter;

    /**
     * Filtre client utilisé lors de la génération (V29).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_filter_id")
    private Client clientFilter;

    /**
     * Filtre statut ticket utilisé lors de la génération (V29).
     */
    @Size(max = 50)
    @Column(name = "status_filter", length = 50)
    private String statusFilter;

    /**
     * Utilisateur ayant créé/uploadé le rapport.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // =========================================================================
    // STATISTIQUES
    // =========================================================================
    
    /**
     * Nombre de téléchargements du rapport.
     */
    @Builder.Default
    @Column(name = "download_count", nullable = false)
    private Integer downloadCount = 0;

    /**
     * Indique si le rapport est publié (visible par tous les managers).
     */
    @Builder.Default
    @Column(name = "is_published", nullable = false)
    private Boolean isPublished = false;

    /**
     * Origine du rapport: UPLOADED (PDF uploadé) ou GENERATED (généré par le système).
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "source", nullable = false, length = 20)
    @Builder.Default
    private ReportSource source = ReportSource.UPLOADED;

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
     * Incrémente le compteur de téléchargements.
     */
    public void incrementDownloadCount() {
        this.downloadCount++;
    }

    /**
     * Publie le rapport (le rend visible).
     */
    public void publish() {
        this.isPublished = true;
    }

    /**
     * Dépublie le rapport (le cache).
     */
    public void unpublish() {
        this.isPublished = false;
    }

    /**
     * Retourne la taille du fichier formatée (Ko, Mo).
     */
    public String getFormattedFileSize() {
        if (fileSize == null || fileSize == 0) {
            return "0 Ko";
        }
        if (fileSize < 1024) {
            return fileSize + " octets";
        }
        if (fileSize < 1024 * 1024) {
            return String.format("%.1f Ko", fileSize / 1024.0);
        }
        return String.format("%.1f Mo", fileSize / (1024.0 * 1024.0));
    }

    /**
     * Retourne la période formatée.
     * Ex: "01/02/2026 - 28/02/2026"
     */
    public String getFormattedPeriod() {
        if (periodStart == null || periodEnd == null) {
            return "";
        }
        return String.format("%s - %s", periodStart, periodEnd);
    }
}
