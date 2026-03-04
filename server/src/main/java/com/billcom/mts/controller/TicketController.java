package com.billcom.mts.controller;

// =============================================================================
// IMPORTS - Dépendances du controller de tickets
// =============================================================================

// DTOs - Objets de transfert pour les tickets
import com.billcom.mts.dto.ticket.*;
import com.billcom.mts.entity.User;

// Enums - Types énumérés pour les tickets
import com.billcom.mts.enums.SlaStatus;
import com.billcom.mts.enums.TicketCategory;   // Mobile, Internet, Fixe, etc.
import com.billcom.mts.enums.TicketPriority;   // LOW, MEDIUM, HIGH, CRITICAL
import com.billcom.mts.enums.TicketStatus;     // OPEN, IN_PROGRESS, RESOLVED, etc.

// Service de gestion des tickets
import com.billcom.mts.service.TicketService;

// Swagger/OpenAPI - Documentation
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// Jakarta Servlet
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

// Lombok
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;  // Pour les logs

// Spring Data - Pagination
import org.springframework.data.domain.Page;      // Résultat paginé
import org.springframework.data.domain.Pageable;  // Paramètres de pagination

// Spring HTTP
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

// Spring Security
import org.springframework.security.access.prepost.PreAuthorize;  // Contrôle d'accès par rôle
import org.springframework.security.core.annotation.AuthenticationPrincipal;

// Spring Web
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

// =============================================================================
// CONTROLLER DE GESTION DES TICKETS
// =============================================================================
/**
 * ============================================================================
 * TicketController - Contrôleur REST pour la gestion des tickets
 * ============================================================================
 * 
 * RÔLE:
 * Ce controller gère toutes les opérations CRUD et métier sur les tickets.
 * C'est le cœur métier de l'application MTS Telecom.
 * 
 * ENDPOINTS DISPONIBLES:
 * - POST   /api/tickets              → Créer un ticket (CLIENT)
 * - GET    /api/tickets/{id}         → Obtenir un ticket par ID
 * - GET    /api/tickets/number/{num} → Obtenir par numéro (TKT-2024-00001)
 * - GET    /api/tickets              → Liste tous les tickets (paginé)
 * - GET    /api/tickets/search       → Recherche avec filtres
 * - POST   /api/tickets/{id}/status  → Changer le statut
 * - POST   /api/tickets/{id}/assign  → Assigner à un agent
 * - DELETE /api/tickets/{id}/assign  → Désassigner
 * - POST   /api/tickets/{id}/comments → Ajouter un commentaire
 * - GET    /api/tickets/my-tickets   → Mes tickets (CLIENT)
 * - GET    /api/tickets/assigned     → Mes tickets assignés (AGENT)
 * - GET    /api/tickets/sla-breached → Tickets SLA dépassé
 * - GET    /api/tickets/stats/*      → Statistiques
 * 
 * ANNOTATIONS:
 * @Slf4j: Crée automatiquement un logger "log" (Lombok)
 * @RestController: Controller REST (retourne du JSON)
 * @RequestMapping("/api/tickets"): Préfixe d'URL
 * @RequiredArgsConstructor: Génère constructeur avec final fields
 * @Tag: Documentation Swagger
 * 
 * ============================================================================
 */
@Slf4j
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Gestion des tickets télécom")
public class TicketController {

    // =========================================================================
    // DÉPENDANCES
    // =========================================================================
    
    /** Service contenant la logique métier des tickets */
    private final TicketService ticketService;

    // =========================================================================
    // ENDPOINTS CRUD
    // =========================================================================

    /**
     * POST /api/tickets - Crée un nouveau ticket.
     * 
     * RESTRICTION: Seuls les CLIENTS peuvent créer des tickets.
     * 
     * @PreAuthorize("hasRole('CLIENT')"): Spring vérifie le rôle AVANT d'exécuter.
     * Si l'utilisateur n'a pas le rôle CLIENT → 403 Forbidden automatiquement.
     * 
     * NOTE: On récupère l'adresse IP du client pour l'historique/audit.
     * 
     * @param request Données du ticket à créer
     * @param user Utilisateur connecté (le client)
     * @param httpRequest Pour récupérer l'adresse IP
     * @return Le ticket créé avec statut 201 Created
     */
    @PostMapping
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Crée un nouveau ticket (Client uniquement)")
    public ResponseEntity<TicketResponse> createTicket(
            @Valid @RequestBody TicketCreateRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        
        // Récupère l'IP du client (utile pour l'audit)
        String ipAddress = getClientIpAddress(httpRequest);
        
        // Appelle le service pour créer le ticket
        TicketResponse ticket = ticketService.createTicket(request, user, ipAddress);
        
        // Log pour suivi (visible dans les logs serveur)
        log.info("Ticket créé: {} par {}", ticket.getTicketNumber(), user.getEmail());
        
        // Retourne 201 Created avec le ticket
        return ResponseEntity.status(HttpStatus.CREATED).body(ticket);
    }

    /**
     * GET /api/tickets/{id} - Récupère un ticket par son ID.
     * 
     * SÉCURITÉ: Utilise la version sécurisée qui vérifie l'accès par rôle.
     * - CLIENT: Ne voit que SES tickets
     * - AGENT/MANAGER/ADMIN: Voit tous les tickets
     * 
     * @PathVariable: Extrait la valeur {id} de l'URL.
     * Exemple: GET /api/tickets/42 → id = 42
     * 
     * @param id ID numérique du ticket
     * @param user Utilisateur connecté (pour vérifier l'accès)
     * @return Le ticket ou 403 Forbidden si pas d'accès
     */
    @GetMapping("/{id}")
    @Operation(summary = "Récupère un ticket par ID (avec contrôle d'accès)")
    public ResponseEntity<TicketResponse> getTicketById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getTicketByIdSecured(id, user));
    }

    /**
     * GET /api/tickets/number/{ticketNumber} - Récupère par numéro.
     * 
     * Le numéro de ticket est plus user-friendly que l'ID.
     * Format: TKT-AAAA-NNNNN (ex: TKT-2024-00001)
     * 
     * @param ticketNumber Le numéro de ticket
     * @return Le ticket ou 404 Not Found
     */
    @GetMapping("/number/{ticketNumber}")
    @Operation(summary = "Récupère un ticket par numéro (ex: TKT-2024-00001, avec contrôle d'accès)")
    public ResponseEntity<TicketResponse> getTicketByNumber(
            @PathVariable String ticketNumber,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getTicketByNumberSecured(ticketNumber, user));
    }

    /**
     * GET /api/tickets - Liste tous les tickets avec pagination.
     * 
     * FILTRAGE PAR RÔLE:
     * - CLIENT: Voit uniquement SES tickets
     * - AGENT: Voit les tickets qui lui sont assignés
     * - MANAGER/ADMIN: Voit tous les tickets
     * 
     * Pageable: Paramètres de pagination automatiquement parsés de l'URL:
     * - ?page=0        → Première page (0-indexed)
     * - ?size=20       → 20 éléments par page
     * - ?sort=createdAt,desc → Tri par date décroissante
     * 
     * @param user L'utilisateur connecté (pour filtrer)
     * @param pageable Paramètres de pagination
     * @return Page de tickets
     */
    @GetMapping
    @Operation(summary = "Liste les tickets (filtrés par rôle). Accepte les mêmes paramètres que /search pour filtres avancés.")
    public ResponseEntity<Page<TicketResponse>> getAllTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) SlaStatus slaStatus,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            Pageable pageable) {
        LocalDate from = dateFrom != null ? dateFrom : fromDate;
        LocalDate to = dateTo != null ? dateTo : toDate;
        if (search != null || status != null || priority != null || category != null
                || serviceId != null || assignedToId != null || clientId != null
                || slaStatus != null || from != null || to != null) {
            return ResponseEntity.ok(ticketService.searchTickets(user, search, status, priority, category,
                serviceId, assignedToId, clientId, slaStatus, from, to, pageable));
        }
        return ResponseEntity.ok(ticketService.getAllTickets(user, pageable));
    }

    /**
     * GET /api/tickets/search - Recherche avec filtres.
     * 
     * Permet des recherches avancées avec multiples critères:
     * - search: Texte libre (cherche dans titre, description, numéro)
     * - status: Statut du ticket (OPEN, IN_PROGRESS, etc.)
     * - priority: Priorité (LOW, MEDIUM, HIGH, CRITICAL)
     * - category: Catégorie (MOBILE, INTERNET, etc.)
     * - serviceId: ID du service télécom concerné
     * - assignedToId: ID de l'agent assigné
     * 
     * @RequestParam: Récupère les query params de l'URL
     * (required = false): Paramètre optionnel
     * 
     * @return Page de tickets correspondant aux filtres
     */
    @GetMapping("/search")
    @Operation(summary = "Recherche de tickets avec filtres avancés")
    public ResponseEntity<Page<TicketResponse>> searchTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) SlaStatus slaStatus,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            Pageable pageable) {
        
        return ResponseEntity.ok(ticketService.searchTickets(
            user, search, status, priority, category, serviceId, assignedToId,
            clientId, slaStatus, dateFrom, dateTo, pageable));
    }

    // =========================================================================
    // BULK ACTIONS ET EXPORT
    // =========================================================================

    @PostMapping("/bulk/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Assigner en masse des tickets à un agent")
    public ResponseEntity<com.billcom.mts.dto.ticket.BulkResultDto> bulkAssign(
            @Valid @RequestBody com.billcom.mts.dto.ticket.BulkAssignRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        String ip = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(ticketService.bulkAssign(request, user, ip));
    }

    @PostMapping("/bulk/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Changer le statut en masse")
    public ResponseEntity<com.billcom.mts.dto.ticket.BulkResultDto> bulkStatus(
            @Valid @RequestBody com.billcom.mts.dto.ticket.BulkStatusRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        String ip = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(ticketService.bulkStatusChange(request, user, ip));
    }

    @PostMapping("/bulk/priority")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Changer la priorité en masse")
    public ResponseEntity<com.billcom.mts.dto.ticket.BulkResultDto> bulkPriority(
            @Valid @RequestBody com.billcom.mts.dto.ticket.BulkPriorityRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        String ip = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(ticketService.bulkPriorityChange(request, user, ip));
    }

    @GetMapping(value = "/export/csv", produces = "text/csv; charset=UTF-8")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Export CSV des tickets (filtres identiques à /search)")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) SlaStatus slaStatus,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo) {
        byte[] csv = ticketService.exportTicketsCsv(user, search, status, priority, category,
            serviceId, assignedToId, clientId, slaStatus, dateFrom, dateTo);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDispositionFormData("attachment", "tickets_export.csv");
        return ResponseEntity.ok().headers(headers).body(csv);
    }

    @GetMapping(value = "/export/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Export Excel des tickets (filtres identiques à /search)")
    public ResponseEntity<byte[]> exportExcel(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) SlaStatus slaStatus,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo) {
        byte[] excel = ticketService.exportTicketsExcel(user, search, status, priority, category,
            serviceId, assignedToId, clientId, slaStatus, dateFrom, dateTo);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDispositionFormData("attachment", "tickets_export.xlsx");
        return ResponseEntity.ok().headers(headers).body(excel);
    }

    @GetMapping(value = "/export/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Export PDF des tickets (filtres identiques à /search)")
    public ResponseEntity<byte[]> exportPdf(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) Long serviceId,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) SlaStatus slaStatus,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo) {
        byte[] pdf = ticketService.exportTicketsPdf(user, search, status, priority, category,
            serviceId, assignedToId, clientId, slaStatus, dateFrom, dateTo);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDispositionFormData("attachment", "tickets_export.pdf");
        return ResponseEntity.ok().headers(headers).contentType(MediaType.APPLICATION_PDF).body(pdf);
    }

    // =========================================================================
    // ENDPOINTS WORKFLOW (Cycle de vie du ticket)
    // =========================================================================

    /**
     * POST /api/tickets/{id}/status - Change le statut d'un ticket.
     * 
     * WORKFLOW DES STATUTS:
     * OPEN → IN_PROGRESS → WAITING_CLIENT → RESOLVED → CLOSED
     *                    → ESCALATED
     * 
     * RESTRICTION: Agents, Managers et Admins seulement.
     * Les clients ne peuvent pas changer le statut.
     * 
     * @param id ID du ticket
     * @param request Nouveau statut + commentaire optionnel
     * @param user Utilisateur qui fait le changement
     * @return Le ticket mis à jour
     */
    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Change le statut d'un ticket")
    public ResponseEntity<TicketResponse> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody TicketStatusChangeRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        
        String ipAddress = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(ticketService.changeStatus(id, request, user, ipAddress));
    }

    /**
     * POST /api/tickets/{id}/assign - Assigne un ticket à un agent.
     * 
     * RESTRICTION: Managers et Admins seulement.
     * C'est le manager qui décide quel agent traite quel ticket.
     * 
     * @param id ID du ticket
     * @param request ID de l'agent à assigner
     * @param user Le manager/admin qui assigne
     * @return Le ticket mis à jour
     */
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Assigne un ticket à un agent")
    public ResponseEntity<TicketResponse> assignTicket(
            @PathVariable Long id,
            @Valid @RequestBody TicketAssignRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        
        String ipAddress = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(ticketService.assignTicket(id, request, user, ipAddress));
    }

    /**
     * DELETE /api/tickets/{id}/assign - Désassigne un ticket.
     * 
     * Retire l'agent actuellement assigné au ticket.
     * Le ticket revient dans le pool non assigné.
     * 
     * @DeleteMapping: Gère les requêtes HTTP DELETE
     * 
     * @param id ID du ticket
     * @param user Le manager/admin qui désassigne
     * @return Le ticket mis à jour
     */
    @DeleteMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Désassigne un ticket")
    public ResponseEntity<TicketResponse> unassignTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        
        String ipAddress = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(ticketService.unassignTicket(id, user, ipAddress));
    }

    // =========================================================================
    // ENDPOINTS COMMENTAIRES
    // =========================================================================

    /**
     * POST /api/tickets/{id}/comments - Ajoute un commentaire.
     * 
     * Les commentaires permettent la communication entre:
     * - Client et Agent
     * - Agents entre eux
     * - Notes internes (visibles uniquement par le staff)
     * 
     * @param id ID du ticket
     * @param request Contenu du commentaire + visibilité
     * @param user Auteur du commentaire
     * @return Le ticket mis à jour avec le nouveau commentaire
     */
    @PostMapping("/{id}/apply-macro")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Applique une macro sur le ticket (solution ou commentaire)")
    public ResponseEntity<TicketResponse> applyMacro(
            @PathVariable Long id,
            @Valid @RequestBody ApplyMacroRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        String ip = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(ticketService.applyMacro(id, request, user, ip));
    }

    @PostMapping("/{id}/comments")
    @Operation(summary = "Ajoute un commentaire au ticket")
    public ResponseEntity<TicketResponse> addComment(
            @PathVariable Long id,
            @Valid @RequestBody TicketCommentRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        
        String ipAddress = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(ticketService.addComment(id, request, user, ipAddress));
    }

    // =========================================================================
    // PIÈCES JOINTES
    // =========================================================================

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Ajoute une pièce jointe au ticket")
    public ResponseEntity<TicketResponse> addAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.addAttachment(id, file, user));
    }

    @GetMapping("/{id}/attachments/{attachmentId}/download")
    @Operation(summary = "Télécharge une pièce jointe (contrôle d'accès selon rôle)")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @PathVariable Long attachmentId,
            @AuthenticationPrincipal User user) {
        var download = ticketService.getAttachmentForDownload(id, attachmentId, user);
        String filename = download.getFileName() != null ? download.getFileName() : "attachment";
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .body(download.getResource());
    }

    // =========================================================================
    // ENDPOINTS SPÉCIFIQUES CLIENT
    // =========================================================================

    /**
     * GET /api/tickets/my-tickets - Récupère mes tickets.
     * 
     * Endpoint dédié pour les clients.
     * Retourne uniquement les tickets créés par le client connecté.
     * 
     * @param user Le client connecté
     * @param pageable Pagination
     * @return Page des tickets du client
     */
    @GetMapping("/my-tickets")
    @PreAuthorize("hasRole('CLIENT')")
    @Operation(summary = "Récupère les tickets du client connecté")
    public ResponseEntity<Page<TicketResponse>> getMyTickets(
            @AuthenticationPrincipal User user,
            Pageable pageable) {
        return ResponseEntity.ok(ticketService.getAllTickets(user, pageable));
    }

    /**
     * GET /api/tickets/assigned - Récupère les tickets assignés à l'agent.
     * 
     * Endpoint dédié pour les agents.
     * Retourne uniquement les tickets assignés à l'agent connecté.
     * 
     * @param user L'agent connecté
     * @param pageable Pagination
     * @return Page des tickets assignés
     */
    @GetMapping("/assigned")
    @PreAuthorize("hasRole('AGENT')")
    @Operation(summary = "Récupère les tickets assignés à l'agent connecté")
    public ResponseEntity<Page<TicketResponse>> getAssignedTickets(
            @AuthenticationPrincipal User user,
            Pageable pageable) {
        return ResponseEntity.ok(ticketService.getAgentTickets(user.getId(), pageable));
    }

    // =========================================================================
    // ENDPOINTS SLA (Service Level Agreement)
    // =========================================================================

    /**
     * GET /api/tickets/sla-breached - Tickets ayant dépassé le SLA.
     * 
     * SLA = Service Level Agreement (Accord de niveau de service)
     * Définit le temps maximum pour résoudre un ticket selon sa priorité:
     * - CRITICAL: 4h
     * - HIGH: 8h
     * - MEDIUM: 24h
     * - LOW: 72h
     * 
     * Cet endpoint retourne les tickets qui ont dépassé leur deadline.
     * Utile pour le suivi qualité et les alertes.
     * 
     * @return Liste des tickets en dépassement SLA
     */
    @GetMapping("/sla-breached")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Récupère les tickets ayant dépassé le SLA")
    public ResponseEntity<List<TicketResponse>> getSlaBreachedTickets() {
        return ResponseEntity.ok(ticketService.getSlaBreachedTickets());
    }

    /**
     * GET /api/tickets/sla-approaching - Tickets approchant le SLA.
     * 
     * Permet d'anticiper les dépassements de SLA.
     * Par défaut, retourne les tickets à moins de 4h de leur deadline.
     * 
     * @param hoursBeforeDeadline Nombre d'heures avant la deadline
     * @return Liste des tickets approchant le SLA
     */
    @GetMapping("/sla-approaching")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Récupère les tickets approchant le SLA")
    public ResponseEntity<List<TicketResponse>> getTicketsApproachingSla(
            @RequestParam(defaultValue = "4") int hoursBeforeDeadline) {
        return ResponseEntity.ok(ticketService.getTicketsApproachingSla(hoursBeforeDeadline));
    }

    // =========================================================================
    // ENDPOINTS STATISTIQUES
    // =========================================================================

    /**
     * GET /api/tickets/stats/by-status - Compte les tickets par statut.
     * 
     * Retourne un Map avec le nombre de tickets pour chaque statut:
     * { OPEN: 15, IN_PROGRESS: 8, RESOLVED: 42, ... }
     * 
     * Utile pour le dashboard et les graphiques.
     * 
     * @return Map statut → nombre de tickets
     */
    @GetMapping("/stats/by-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Compte les tickets par statut")
    public ResponseEntity<Map<TicketStatus, Long>> getTicketCountByStatus() {
        return ResponseEntity.ok(ticketService.getTicketCountByStatus());
    }

    /**
     * GET /api/tickets/stats/by-priority - Compte les tickets par priorité.
     * 
     * Retourne un Map avec le nombre de tickets pour chaque priorité:
     * { LOW: 20, MEDIUM: 35, HIGH: 10, CRITICAL: 2 }
     * 
     * @return Map priorité → nombre de tickets
     */
    @GetMapping("/stats/by-priority")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Compte les tickets par priorité")
    public ResponseEntity<Map<TicketPriority, Long>> getTicketCountByPriority() {
        return ResponseEntity.ok(ticketService.getTicketCountByPriority());
    }

    /**
     * GET /api/tickets/stats/avg-resolution - Temps moyen de résolution.
     */
    @GetMapping("/stats/avg-resolution")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Temps moyen de résolution (heures)")
    public ResponseEntity<Map<String, Object>> getAverageResolutionTime() {
        Double avg = ticketService.getAverageResolutionTimeHours();
        return ResponseEntity.ok(Map.of(
            "averageResolutionTimeHours", avg != null ? avg : 0.0
        ));
    }

    /**
     * GET /api/tickets/stats/sla-compliance - Taux de conformité SLA.
     */
    @GetMapping("/stats/sla-compliance")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Taux de conformité SLA (0.0 - 1.0)")
    public ResponseEntity<Map<String, Object>> getSlaComplianceRate() {
        Double rate = ticketService.getSlaComplianceRate();
        return ResponseEntity.ok(Map.of(
            "slaComplianceRate", rate != null ? rate : 1.0
        ));
    }

    // =========================================================================
    // MÉTHODES UTILITAIRES PRIVÉES
    // =========================================================================

    /**
     * Récupère l'adresse IP réelle du client.
     * 
     * POURQUOI C'EST COMPLIQUÉ?
     * Quand l'app est derrière un proxy/load balancer:
     * - request.getRemoteAddr() retourne l'IP du proxy
     * - L'IP réelle est dans les headers X-Forwarded-For ou X-Real-IP
     * 
     * X-Forwarded-For peut contenir plusieurs IPs (chaîne de proxies):
     * "client, proxy1, proxy2" → On prend la première (le client)
     * 
     * @param request La requête HTTP
     * @return L'adresse IP du client
     */
    private String getClientIpAddress(HttpServletRequest request) {
        // Essaie d'abord X-Forwarded-For (standard)
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Prend la première IP (le client original)
            return xForwardedFor.split(",")[0].trim();
        }
        
        // Sinon, essaie X-Real-IP (utilisé par Nginx)
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        // En dernier recours, utilise l'adresse distante directe
        return request.getRemoteAddr();
    }
}
// =============================================================================
// FIN DU CONTROLLER DE TICKETS
// =============================================================================
