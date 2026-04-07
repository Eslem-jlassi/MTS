package com.billcom.mts.controller;

import com.billcom.mts.dto.incident.*;
import com.billcom.mts.dto.security.AdminHardDeleteRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.Severity;
import com.billcom.mts.service.IncidentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
@Tag(name = "Incidents", description = "Supervision - incidents liés aux services")
public class IncidentController {

    private final IncidentService incidentService;

    // =========================================================================
    // CRUD
    // =========================================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Créer un incident")
    public ResponseEntity<IncidentResponse> create(
            @Valid @RequestBody IncidentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidentService.create(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Modifier un incident")
    public ResponseEntity<IncidentResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody IncidentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.update(id, request, user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Détail d'un incident")
    public ResponseEntity<IncidentResponse> getById(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.getById(id, user));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Liste paginée des incidents")
    public ResponseEntity<Page<IncidentResponse>> list(Pageable pageable, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.findAll(pageable, user));
    }

    @GetMapping("/filter")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Filtrer les incidents")
    public ResponseEntity<Page<IncidentResponse>> filter(
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) Severity severity,
            @RequestParam(required = false) Long serviceId,
            Pageable pageable,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.findFiltered(status, severity, serviceId, pageable, user));
    }

    @GetMapping("/service/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Incidents d'un service")
    public ResponseEntity<Page<IncidentResponse>> byService(
            @PathVariable Long serviceId, Pageable pageable, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.findByServiceId(serviceId, pageable, user));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Incidents actifs (OPEN, IN_PROGRESS)")
    public ResponseEntity<List<IncidentResponse>> active(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.findActive(user));
    }

    @GetMapping("/affected-service/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Incidents affectant un service (many-to-many)")
    public ResponseEntity<List<IncidentResponse>> byAffectedService(
            @PathVariable Long serviceId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.findByAffectedService(serviceId, user));
    }

    // =========================================================================
    // STATUS & ACTIONS
    // =========================================================================

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Changer le statut d'un incident")
    public ResponseEntity<IncidentResponse> changeStatus(
            @PathVariable Long id,
            @RequestParam IncidentStatus status,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.changeStatus(id, status, user));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Clôturer un incident")
    public ResponseEntity<IncidentResponse> close(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.close(id, user));
    }

    // =========================================================================
    // TIMELINE & NOTES
    // =========================================================================

    @GetMapping("/{id}/timeline")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Timeline complète d'un incident")
    public ResponseEntity<List<IncidentTimelineResponse>> getTimeline(
            @PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.getTimeline(id, user));
    }

    @PostMapping("/{id}/notes")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Ajouter une note à la timeline")
    public ResponseEntity<IncidentTimelineResponse> addNote(
            @PathVariable Long id,
            @Valid @RequestBody IncidentNoteRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidentService.addNote(id, request, user));
    }

    // =========================================================================
    // POST-MORTEM
    // =========================================================================

    @PostMapping("/{id}/post-mortem")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Enregistrer le post-mortem (RCA)")
    public ResponseEntity<IncidentResponse> savePostMortem(
            @PathVariable Long id,
            @Valid @RequestBody PostMortemRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.savePostMortem(id, request, user));
    }

    // =========================================================================
    // TICKET LINKING
    // =========================================================================

    @PostMapping("/{id}/tickets")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Lier des tickets à un incident")
    public ResponseEntity<IncidentResponse> linkTickets(
            @PathVariable Long id,
            @RequestBody List<Long> ticketIds,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.linkTickets(id, ticketIds, user));
    }

    @DeleteMapping("/{id}/tickets/{ticketId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Délier un ticket d'un incident")
    public ResponseEntity<IncidentResponse> unlinkTicket(
            @PathVariable Long id,
            @PathVariable Long ticketId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.unlinkTicket(id, ticketId, user));
    }

    // =========================================================================
    // SERVICE LINKING
    // =========================================================================

    @PostMapping("/{id}/services")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Ajouter des services affectés")
    public ResponseEntity<IncidentResponse> linkServices(
            @PathVariable Long id,
            @RequestBody List<Long> serviceIds,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.linkServices(id, serviceIds, user));
    }

    @DeleteMapping("/{id}/services/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Retirer un service affecté")
    public ResponseEntity<IncidentResponse> unlinkService(
            @PathVariable Long id,
            @PathVariable Long serviceId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.unlinkService(id, serviceId, user));
    }

    @DeleteMapping("/{id}/hard-delete")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer définitivement un incident (Réservé aux administrateurs)")
    public ResponseEntity<Map<String, String>> hardDeleteIncident(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AdminHardDeleteRequest deleteRequest,
            HttpServletRequest httpRequest) {
        
        String ipAddress = httpRequest.getHeader("X-Forwarded-For");
        if (ipAddress == null) {
            ipAddress = httpRequest.getRemoteAddr();
        }

        incidentService.hardDeleteIncidentAsAdmin(id, user, ipAddress, deleteRequest);

        return ResponseEntity.ok(Map.of("message", "Incident supprimé définitivement avec succès"));
    }

    @PostMapping("/{id}/hard-delete/challenge")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Envoie un code de verification email pour une suppression definitive d'incident")
    public ResponseEntity<Map<String, String>> issueHardDeleteChallenge(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            HttpServletRequest request) {

        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null) {
            ipAddress = request.getRemoteAddr();
        }

        incidentService.issueHardDeleteChallenge(id, user, ipAddress);
        return ResponseEntity.ok(Map.of("message", "Code de verification envoye"));
    }
}
