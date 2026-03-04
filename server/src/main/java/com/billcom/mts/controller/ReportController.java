package com.billcom.mts.controller;

import com.billcom.mts.dto.report.GenerateReportRequest;
import com.billcom.mts.dto.report.ReportRequest;
import com.billcom.mts.dto.report.ReportResponse;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.ReportType;
import com.billcom.mts.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.time.LocalDate;

// =============================================================================
// CONTRÔLEUR REPORTS - API REST pour les rapports PDF
// =============================================================================
/**
 * ReportController - Endpoints pour gérer les rapports PDF.
 * 
 * RÔLE:
 * Expose les endpoints REST pour:
 * - Upload de rapports PDF (managers uniquement)
 * - Liste et recherche des rapports
 * - Téléchargement des rapports
 * - Publication/dépublication (managers uniquement)
 * 
 * ENDPOINTS:
 * - POST /api/reports/upload : Upload un nouveau rapport
 * - GET /api/reports : Liste paginée des rapports publiés
 * - GET /api/reports/all : Liste tous les rapports (admin)
 * - GET /api/reports/{id} : Détails d'un rapport
 * - GET /api/reports/{id}/download : Télécharge le PDF
 * - PUT /api/reports/{id}/publish : Publie le rapport
 * - PUT /api/reports/{id}/unpublish : Dépublie le rapport
 * - DELETE /api/reports/{id} : Supprime le rapport
 * 
 * SÉCURITÉ:
 * - Upload/modification: MANAGER ou ADMIN uniquement
 * - Consultation: Tout utilisateur authentifié
 */
@Slf4j
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Gestion des rapports PDF")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService reportService;
    private final com.billcom.mts.service.ReportGenerationService reportGenerationService;

    // =========================================================================
    // UPLOAD DE RAPPORT
    // =========================================================================

    /**
     * Upload un nouveau rapport PDF.
     * 
     * ENDPOINT: POST /api/reports/upload
     * Content-Type: multipart/form-data
     * 
     * PARAMÈTRES:
     * - file: Le fichier PDF (required)
     * - title: Titre du rapport (required)
     * - description: Description (optional)
     * - reportType: Type (DAILY, WEEKLY, MONTHLY, etc.)
     * - periodStart: Date début période (YYYY-MM-DD)
     * - periodEnd: Date fin période (YYYY-MM-DD)
     * - serviceId: ID du service concerné (optional)
     * - publish: Publier immédiatement (default: false)
     * 
     * @param file Le fichier PDF uploadé
     * @param title Titre du rapport
     * @param description Description (optionnel)
     * @param reportType Type de rapport
     * @param periodStart Date de début
     * @param periodEnd Date de fin
     * @param serviceId ID du service (optionnel)
     * @param publish Publier immédiatement
     * @param user L'utilisateur connecté
     * @return Le rapport créé
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Upload un nouveau rapport PDF")
    public ResponseEntity<ReportResponse> uploadReport(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("reportType") ReportType reportType,
            @RequestParam("periodStart") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodStart,
            @RequestParam("periodEnd") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodEnd,
            @RequestParam(value = "serviceId", required = false) Long serviceId,
            @RequestParam(value = "publish", defaultValue = "false") Boolean publish,
            @AuthenticationPrincipal User user) {
        
        log.info("[Report] Upload par {}: {}", user.getEmail(), title);

        ReportRequest request = ReportRequest.builder()
                .title(title)
                .description(description)
                .reportType(reportType)
                .periodStart(periodStart)
                .periodEnd(periodEnd)
                .serviceId(serviceId)
                .publish(publish)
                .build();

        ReportResponse response = reportService.createReport(request, file, user);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Re-upload le fichier PDF d'un rapport existant (remplace le fichier actuel).
     * 
     * ENDPOINT: PUT /api/reports/{id}/reupload
     * Content-Type: multipart/form-data
     * 
     * PARAMÈTRES:
     * - id: ID du rapport à mettre à jour
     * - file: Le nouveau fichier PDF
     * 
     * COMPORTEMENT:
     * - Supprime l'ancien fichier
     * - Stocke le nouveau fichier
     * - Met à jour les métadonnées (fileName, fileSize, mimeType)
     * - Conserve les autres informations du rapport (titre, type, période, etc.)
     * 
     * @param id ID du rapport
     * @param file Le nouveau fichier PDF
     * @param user L'utilisateur connecté
     * @return Le rapport mis à jour
     */
    @PutMapping(value = "/{id}/reupload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Re-upload le fichier PDF d'un rapport existant")
    public ResponseEntity<ReportResponse> reuploadReportFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        
        log.info("[Report] Re-upload du fichier du rapport #{} par {}", id, user.getEmail());

        ReportResponse response = reportService.reuploadFile(id, file, user);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Génère un rapport périodique enrichi (tickets + incidents) avec filtres avancés V29.
     * ENDPOINT: POST /api/reports/generate
     *
     * PARAMÈTRES V29:
     * - reportType: WEEKLY, MONTHLY, QUARTERLY, etc.
     * - periodStart / periodEnd: dates ISO
     * - serviceId: filtre par service (optionnel)
     * - team: filtre par équipe (optionnel)
     * - clientId: filtre par client (optionnel)
     * - ticketStatus: filtre par statut ticket (optionnel)
     * - format: "PDF" ou "CSV" (défaut PDF)
     * - publish: publier immédiatement (défaut false)
     */
    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Génère un rapport périodique enrichi (tickets + incidents + executive summary)")
    public ResponseEntity<ReportResponse> generateReport(
            @Valid @RequestBody GenerateReportRequest request,
            @AuthenticationPrincipal User user) {
        ReportResponse response = reportGenerationService.generateReport(request, user);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // RÉCUPÉRATION DES RAPPORTS
    // =========================================================================

    /**
     * Liste les rapports publiés avec pagination.
     * 
     * ENDPOINT: GET /api/reports?page=0&size=10
     * 
     * @param page Numéro de page
     * @param size Nombre d'éléments par page
     * @return Page de rapports publiés
     */
    @GetMapping
    @Operation(summary = "Liste des rapports publiés")
    public ResponseEntity<Page<ReportResponse>> getPublishedReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ReportResponse> reports = reportService.getPublishedReports(pageable);
        
        return ResponseEntity.ok(reports);
    }

    /**
     * Liste TOUS les rapports (pour admins).
     * 
     * ENDPOINT: GET /api/reports/all?page=0&size=10
     * 
     * @param page Numéro de page
     * @param size Nombre d'éléments par page
     * @return Page de tous les rapports
     */
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Liste de tous les rapports (admin)")
    public ResponseEntity<Page<ReportResponse>> getAllReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ReportResponse> reports = reportService.getAllReports(pageable);
        
        return ResponseEntity.ok(reports);
    }

    /**
     * Récupère un rapport par son ID.
     * 
     * ENDPOINT: GET /api/reports/{id}
     * 
     * @param id ID du rapport
     * @return Le rapport
     */
    @GetMapping("/{id}")
    @Operation(summary = "Détails d'un rapport")
    public ResponseEntity<ReportResponse> getReportById(@PathVariable Long id) {
        ReportResponse report = reportService.getReportById(id);
        return ResponseEntity.ok(report);
    }

    /**
     * Recherche de rapports avec filtres.
     * 
     * ENDPOINT: GET /api/reports/search?reportType=MONTHLY&startDate=2026-01-01
     * 
     * @param reportType Type de rapport (optionnel)
     * @param serviceId ID du service (optionnel)
     * @param startDate Date de début (optionnel)
     * @param endDate Date de fin (optionnel)
     * @param page Numéro de page
     * @param size Nombre d'éléments par page
     * @return Page de rapports
     */
    @GetMapping("/search")
    @Operation(summary = "Recherche de rapports avec filtres")
    public ResponseEntity<Page<ReportResponse>> searchReports(
            @RequestParam(required = false) ReportType reportType,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ReportResponse> reports = reportService.searchReports(
                reportType, serviceId, startDate, endDate, pageable);
        
        return ResponseEntity.ok(reports);
    }

    // =========================================================================
    // TÉLÉCHARGEMENT
    // =========================================================================

    /**
     * Télécharge le fichier d'un rapport (PDF ou CSV selon le format stocké).
     * 
     * ENDPOINT: GET /api/reports/{id}/download
     * 
     * @param id ID du rapport
     * @return Le fichier en téléchargement (PDF ou CSV)
     */
    @GetMapping("/{id}/download")
    @Operation(summary = "Télécharge le fichier du rapport (PDF ou CSV)")
    public ResponseEntity<Resource> downloadReport(@PathVariable Long id) {
        
        Resource resource = reportService.downloadReport(id);
        String fileName = reportService.getReportFileName(id);
        String mimeType = reportService.getReportMimeType(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename=\"" + fileName + "\"")
                .body(resource);
    }

    // =========================================================================
    // PUBLICATION
    // =========================================================================

    /**
     * Publie un rapport (le rend visible).
     * 
     * ENDPOINT: PUT /api/reports/{id}/publish
     * 
     * @param id ID du rapport
     * @return Le rapport mis à jour
     */
    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Publie un rapport")
    public ResponseEntity<ReportResponse> publishReport(@PathVariable Long id) {
        ReportResponse report = reportService.publishReport(id);
        return ResponseEntity.ok(report);
    }

    /**
     * Dépublie un rapport (le cache).
     * 
     * ENDPOINT: PUT /api/reports/{id}/unpublish
     * 
     * @param id ID du rapport
     * @return Le rapport mis à jour
     */
    @PutMapping("/{id}/unpublish")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Dépublie un rapport")
    public ResponseEntity<ReportResponse> unpublishReport(@PathVariable Long id) {
        ReportResponse report = reportService.unpublishReport(id);
        return ResponseEntity.ok(report);
    }

    // =========================================================================
    // SUPPRESSION
    // =========================================================================

    /**
     * Supprime un rapport.
     * 
     * ENDPOINT: DELETE /api/reports/{id}
     * 
     * @param id ID du rapport
     * @return 204 No Content si succès
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Supprime un rapport")
    public ResponseEntity<Void> deleteReport(@PathVariable Long id) {
        reportService.deleteReport(id);
        return ResponseEntity.noContent().build();
    }
}
