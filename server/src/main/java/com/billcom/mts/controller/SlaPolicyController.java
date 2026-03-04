package com.billcom.mts.controller;

import com.billcom.mts.dto.sla.SlaPolicyRequest;
import com.billcom.mts.dto.sla.SlaPolicyResponse;
import com.billcom.mts.entity.User;
import com.billcom.mts.service.SlaPolicyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur REST pour la gestion des politiques SLA.
 * <p>
 * Endpoints :
 * <ul>
 *   <li>GET  /api/sla-policies          – Liste toutes les politiques (ADMIN, MANAGER)</li>
 *   <li>GET  /api/sla-policies/{id}     – Détail d'une politique (ADMIN, MANAGER)</li>
 *   <li>GET  /api/sla-policies/count    – Nombre de politiques actives (ADMIN)</li>
 *   <li>POST /api/sla-policies          – Crée une politique (ADMIN)</li>
 *   <li>PUT  /api/sla-policies/{id}     – Met à jour une politique (ADMIN)</li>
 *   <li>DELETE /api/sla-policies/{id}   – Supprime une politique (ADMIN)</li>
 * </ul>
 * Les opérations d'écriture sont tracées dans le journal d'audit.
 */
@RestController
@RequestMapping("/api/sla-policies")
@RequiredArgsConstructor
@Tag(name = "SLA Policies", description = "Gestion des politiques de niveau de service (SLA)")
@SecurityRequirement(name = "bearerAuth")
public class SlaPolicyController {

    private final SlaPolicyService slaPolicyService;

    // =========================================================================
    // LECTURE (ADMIN + MANAGER)
    // =========================================================================

    /**
     * Liste toutes les politiques SLA.
     *
     * @param activeOnly si true, ne retourne que les politiques actives (défaut: false)
     * @return liste ordonnée par priorité
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(
        summary = "Lister les politiques SLA",
        description = "Retourne toutes les politiques SLA, optionnellement filtrées par statut actif"
    )
    public ResponseEntity<List<SlaPolicyResponse>> list(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(slaPolicyService.listAll(activeOnly));
    }

    /**
     * Récupère le détail d'une politique SLA.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Détail d'une politique SLA")
    public ResponseEntity<SlaPolicyResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(slaPolicyService.getById(id));
    }

    /**
     * Compte les politiques SLA actives (KPI dashboard Admin).
     *
     * @return objet JSON avec le champ "count"
     */
    @GetMapping("/count")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Nombre de politiques SLA actives",
        description = "KPI pour le dashboard Admin — retourne le nombre de politiques actives"
    )
    public ResponseEntity<Map<String, Long>> count() {
        return ResponseEntity.ok(Map.of("count", slaPolicyService.countActive()));
    }

    // =========================================================================
    // ÉCRITURE (ADMIN uniquement)
    // =========================================================================

    /**
     * Crée une nouvelle politique SLA.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
        summary = "Créer une politique SLA",
        description = "Crée une nouvelle politique SLA — enregistre une entrée d'audit"
    )
    @ApiResponse(responseCode = "201", description = "Politique créée avec succès")
    @ApiResponse(responseCode = "409", description = "Nom déjà utilisé par une autre politique")
    public ResponseEntity<SlaPolicyResponse> create(
            @Valid @RequestBody SlaPolicyRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        SlaPolicyResponse response = slaPolicyService.create(request, user, httpRequest.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Met à jour une politique SLA existante.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Modifier une politique SLA",
        description = "Met à jour une politique SLA existante — enregistre une entrée d'audit"
    )
    @ApiResponse(responseCode = "200", description = "Politique mise à jour")
    @ApiResponse(responseCode = "404", description = "Politique introuvable")
    @ApiResponse(responseCode = "409", description = "Nom déjà utilisé par une autre politique")
    public ResponseEntity<SlaPolicyResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody SlaPolicyRequest request,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        SlaPolicyResponse response = slaPolicyService.update(id, request, user, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(response);
    }

    /**
     * Supprime une politique SLA.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
        summary = "Supprimer une politique SLA",
        description = "Supprime définitivement une politique SLA — enregistre une entrée d'audit"
    )
    @ApiResponse(responseCode = "204", description = "Politique supprimée")
    @ApiResponse(responseCode = "404", description = "Politique introuvable")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            HttpServletRequest httpRequest) {
        slaPolicyService.delete(id, user, httpRequest.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
