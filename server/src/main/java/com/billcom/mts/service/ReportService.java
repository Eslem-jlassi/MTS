package com.billcom.mts.service;

import com.billcom.mts.dto.report.ReportRequest;
import com.billcom.mts.dto.report.ReportResponse;
import com.billcom.mts.entity.Report;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.ReportType;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.ReportRepository;
import com.billcom.mts.repository.TelecomServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

// =============================================================================
// SERVICE REPORTS - Gestion des rapports PDF
// =============================================================================
/**
 * ReportService - Service gérant les rapports PDF uploadés.
 * 
 * RÔLE:
 * - Upload et stockage des fichiers PDF
 * - CRUD des métadonnées de rapport
 * - Téléchargement des rapports
 * - Publication/dépublication
 * 
 * STOCKAGE:
 * Les fichiers sont stockés dans un dossier configurable (reports.upload-dir).
 * Structure: uploads/reports/YYYY/MM/uuid.pdf
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final TelecomServiceRepository serviceRepository;

    @Value("${reports.upload-dir:uploads/reports}")
    private String uploadDir;

    // =========================================================================
    // CRÉATION DE RAPPORT
    // =========================================================================

    /**
     * Crée un nouveau rapport avec upload du fichier PDF.
     * 
     * FLUX:
     * 1. Valide les données du formulaire
     * 2. Stocke le fichier PDF sur le serveur
     * 3. Crée l'entrée en base de données
     * 
     * @param request DTO avec les métadonnées du rapport
     * @param file Le fichier PDF uploadé
     * @param currentUser L'utilisateur créant le rapport
     * @return Le rapport créé
     */
    @Transactional
    public ReportResponse createReport(ReportRequest request, MultipartFile file, User currentUser) {
        log.info("[Report] Création par {}: {}", currentUser.getEmail(), request.getTitle());

        // Valide le fichier
        validateFile(file);

        // Stocke le fichier
        String filePath = storeFile(file);

        // Récupère le service si spécifié
        TelecomService service = null;
        if (request.getServiceId() != null) {
            service = serviceRepository.findById(request.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Service", "id", request.getServiceId()));
        }

        // Crée l'entité
        Report report = Report.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .reportType(request.getReportType())
                .periodStart(request.getPeriodStart())
                .periodEnd(request.getPeriodEnd())
                .fileName(file.getOriginalFilename())
                .filePath(filePath)
                .fileSize(file.getSize())
                .mimeType(file.getContentType() != null ? 
                        file.getContentType() : "application/pdf")
                .service(service)
                .createdBy(currentUser)
                .isPublished(request.getPublish() != null && request.getPublish())
                .downloadCount(0)
                .build();

        report = reportRepository.save(report);
        log.info("[Report] Rapport créé avec ID: {}", report.getId());

        return mapToResponse(report);
    }
    /**
     * Re-upload le fichier PDF d'un rapport existant.
     * 
     * FLUX:
     * 1. Récupère le rapport existant
     * 2. Supprime l'ancien fichier du disque
     * 3. Stocke le nouveau fichier
     * 4. Met à jour les métadonnées (fileName, fileSize, mimeType, updatedAt)
     * 5. Conserve les autres informations du rapport
     * 
     * @param id ID du rapport
     * @param file Le nouveau fichier PDF
     * @param currentUser L'utilisateur effectuant la modification
     * @return Le rapport mis à jour
     */
    @Transactional
    public ReportResponse reuploadFile(Long id, MultipartFile file, User currentUser) {
        log.info("[Report] Re-upload du fichier du rapport #{} par {}", id, currentUser.getEmail());

        // Récupère le rapport existant
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));

        // Valide le nouveau fichier
        validateFile(file);

        // Supprime l'ancien fichier du disque
        try {
            Path oldFilePath = Paths.get(report.getFilePath());
            Files.deleteIfExists(oldFilePath);
            log.info("[Report] Ancien fichier supprimé: {}", report.getFilePath());
        } catch (IOException e) {
            log.warn("[Report] Impossible de supprimer l'ancien fichier: {}", e.getMessage());
            // Continue quand même pour stocker le nouveau fichier
        }

        // Stocke le nouveau fichier
        String newFilePath = storeFile(file);

        // Met à jour les métadonnées du fichier
        report.setFileName(file.getOriginalFilename());
        report.setFilePath(newFilePath);
        report.setFileSize(file.getSize());
        report.setMimeType(file.getContentType() != null ? 
                file.getContentType() : "application/pdf");
        // updatedAt sera automatiquement mis à jour par @UpdateTimestamp

        // Sauvegarde les modifications
        report = reportRepository.save(report);
        log.info("[Report] Fichier du rapport #{} mis à jour avec succès", id);

        return mapToResponse(report);
    }
    // =========================================================================
    // RÉCUPÉRATION DES RAPPORTS
    // =========================================================================

    /**
     * Récupère les rapports publiés avec pagination.
     * 
     * @param pageable Configuration de pagination
     * @return Page de rapports publiés
     */
    @Transactional(readOnly = true)
    public Page<ReportResponse> getPublishedReports(Pageable pageable) {
        return reportRepository.findByIsPublishedTrueOrderByCreatedAtDesc(pageable)
                .map(this::mapToResponse);
    }

    /**
     * Récupère tous les rapports (pour admins).
     * 
     * @param pageable Configuration de pagination
     * @return Page de tous les rapports
     */
    @Transactional(readOnly = true)
    public Page<ReportResponse> getAllReports(Pageable pageable) {
        return reportRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToResponse);
    }

    /**
     * Récupère un rapport par son ID.
     * 
     * @param id ID du rapport
     * @return Le rapport
     */
    @Transactional(readOnly = true)
    public ReportResponse getReportById(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));
        return mapToResponse(report);
    }

    /**
     * Recherche de rapports avec filtres.
     * 
     * @param reportType Type de rapport (optionnel)
     * @param serviceId ID du service (optionnel)
     * @param startDate Date de début (optionnel)
     * @param endDate Date de fin (optionnel)
     * @param pageable Pagination
     * @return Page de rapports
     */
    @Transactional(readOnly = true)
    public Page<ReportResponse> searchReports(
            ReportType reportType, Long serviceId,
            LocalDate startDate, LocalDate endDate,
            Pageable pageable) {
        
        return reportRepository.searchReports(reportType, serviceId, startDate, endDate, pageable)
                .map(this::mapToResponse);
    }

    // =========================================================================
    // TÉLÉCHARGEMENT
    // =========================================================================

    /**
     * Télécharge le fichier PDF d'un rapport.
     * 
     * @param id ID du rapport
     * @return Resource du fichier
     */
    @Transactional
    public Resource downloadReport(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));

        // Incrémente le compteur de téléchargements
        report.incrementDownloadCount();
        reportRepository.save(report);

        try {
            Path filePath = Paths.get(report.getFilePath()).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Fichier non trouvé: " + report.getFileName());
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Erreur lors de la lecture du fichier", e);
        }
    }

    /**
     * Récupère le nom du fichier pour le Content-Disposition.
     */
    @Transactional(readOnly = true)
    public String getReportFileName(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));
        return report.getFileName();
    }

    /**
     * Récupère le type MIME du rapport pour la réponse HTTP (V29: PDF ou CSV).
     */
    @Transactional(readOnly = true)
    public String getReportMimeType(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));
        return report.getMimeType() != null ? report.getMimeType() : "application/pdf";
    }

    // =========================================================================
    // PUBLICATION
    // =========================================================================

    /**
     * Publie un rapport (le rend visible à tous).
     * 
     * @param id ID du rapport
     * @return Le rapport mis à jour
     */
    @Transactional
    public ReportResponse publishReport(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));
        
        report.publish();
        report = reportRepository.save(report);
        
        log.info("[Report] Rapport {} publié", id);
        return mapToResponse(report);
    }

    /**
     * Dépublie un rapport (le cache).
     * 
     * @param id ID du rapport
     * @return Le rapport mis à jour
     */
    @Transactional
    public ReportResponse unpublishReport(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));
        
        report.unpublish();
        report = reportRepository.save(report);
        
        log.info("[Report] Rapport {} dépublié", id);
        return mapToResponse(report);
    }

    // =========================================================================
    // SUPPRESSION
    // =========================================================================

    /**
     * Supprime un rapport et son fichier.
     * 
     * @param id ID du rapport
     */
    @Transactional
    public void deleteReport(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));

        // Supprime le fichier du disque
        try {
            Path filePath = Paths.get(report.getFilePath());
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("[Report] Impossible de supprimer le fichier: {}", e.getMessage());
        }

        // Supprime l'entrée en base
        reportRepository.delete(report);
        log.info("[Report] Rapport {} supprimé", id);
    }

    // =========================================================================
    // MÉTHODES PRIVÉES
    // =========================================================================

    /**
     * Valide le fichier uploadé.
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est obligatoire");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new IllegalArgumentException("Seuls les fichiers PDF sont acceptés");
        }

        // Limite à 10 Mo
        long maxSize = 10 * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("Le fichier ne peut pas dépasser 10 Mo");
        }
    }

    /**
     * Stocke le fichier sur le serveur.
     * 
     * @param file Le fichier à stocker
     * @return Le chemin relatif du fichier stocké
     */
    private String storeFile(MultipartFile file) {
        try {
            // Crée le chemin: uploads/reports/YYYY/MM/
            LocalDateTime now = LocalDateTime.now();
            String yearMonth = now.format(DateTimeFormatter.ofPattern("yyyy/MM"));
            Path targetDir = Paths.get(uploadDir, yearMonth);
            
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            // Génère un nom unique
            String uniqueFileName = UUID.randomUUID().toString() + ".pdf";
            Path targetPath = targetDir.resolve(uniqueFileName);

            // Copie le fichier
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            log.debug("[Report] Fichier stocké: {}", targetPath);
            return targetPath.toString();

        } catch (IOException e) {
            throw new RuntimeException("Erreur lors du stockage du fichier", e);
        }
    }

    /**
     * Mappe une entité Report vers un DTO Response.
     * V29: inclut executiveSummary, format, filtres utilisés.
     * Note: Les KPIs embarqués ne sont renseignés que lors de la génération
     * (dans ReportGenerationService). Pour les rapports existants, ils restent null.
     */
    private ReportResponse mapToResponse(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .title(report.getTitle())
                .description(report.getDescription())
                .executiveSummary(report.getExecutiveSummary())
                .reportType(report.getReportType().name())
                .reportTypeLabel(report.getReportType().getLabel())
                .periodStart(report.getPeriodStart())
                .periodEnd(report.getPeriodEnd())
                .formattedPeriod(report.getFormattedPeriod())
                .fileName(report.getFileName())
                .fileSize(report.getFileSize())
                .formattedFileSize(report.getFormattedFileSize())
                .mimeType(report.getMimeType())
                .format(report.getFormat())
                .serviceId(report.getService() != null ? report.getService().getId() : null)
                .serviceName(report.getService() != null ? report.getService().getName() : null)
                .serviceFilterId(report.getServiceFilter() != null ? report.getServiceFilter().getId() : null)
                .serviceFilterName(report.getServiceFilter() != null ? report.getServiceFilter().getName() : null)
                .teamFilter(report.getTeamFilter())
                .clientFilterId(report.getClientFilter() != null ? report.getClientFilter().getId() : null)
                .clientFilterName(report.getClientFilter() != null ? report.getClientFilter().getCompanyName() : null)
                .statusFilter(report.getStatusFilter())
                .createdById(report.getCreatedBy().getId())
                .createdByName(report.getCreatedBy().getFullName())
                .downloadCount(report.getDownloadCount())
                .isPublished(report.getIsPublished())
                .source(report.getSource() != null ? report.getSource().name() : "UPLOADED")
                .sourceLabel(report.getSource() != null ? report.getSource().getLabel() : "Uploadé")
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }
}
