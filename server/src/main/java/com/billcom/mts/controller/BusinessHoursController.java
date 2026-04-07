package com.billcom.mts.controller;

import com.billcom.mts.dto.sla.BusinessHoursRequest;
import com.billcom.mts.dto.sla.BusinessHoursResponse;
import com.billcom.mts.entity.BusinessHours;
import com.billcom.mts.entity.User;
import com.billcom.mts.repository.BusinessHoursRepository;
import com.billcom.mts.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Contrôleur REST pour la gestion des horaires ouvrés (Business Hours).
 *
 * Les horaires ouvrés déterminent les plages pendant lesquelles le SLA est actif.
 * NULL = mode 24/7.
 */
@Slf4j
@RestController
@RequestMapping("/api/business-hours")
@RequiredArgsConstructor
@Tag(name = "Horaires ouvrés", description = "Gestion des plages horaires ouvrées pour le calcul SLA")
public class BusinessHoursController {

    private final BusinessHoursRepository businessHoursRepository;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Liste des horaires ouvrés")
    public ResponseEntity<List<BusinessHoursResponse>> list(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        List<BusinessHours> items = activeOnly
                ? businessHoursRepository.findByActiveTrueOrderByNameAsc()
                : businessHoursRepository.findAllByOrderByNameAsc();
        return ResponseEntity.ok(items.stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Détail d'un horaire ouvré")
    public ResponseEntity<BusinessHoursResponse> getById(@PathVariable Long id) {
        BusinessHours bh = businessHoursRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Horaire introuvable"));
        return ResponseEntity.ok(mapToResponse(bh));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un horaire ouvré")
    public ResponseEntity<BusinessHoursResponse> create(
            @Valid @RequestBody BusinessHoursRequest request,
            @AuthenticationPrincipal User actor,
            HttpServletRequest httpRequest) {
        BusinessHours bh = BusinessHours.builder()
                .name(request.getName())
                .startHour(request.getStartHour())
                .endHour(request.getEndHour())
                .workDays(request.getWorkDays())
                .timezone(request.getTimezone() != null ? request.getTimezone() : "Europe/Paris")
                .isDefault(request.getIsDefault() != null ? request.getIsDefault() : false)
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        BusinessHours saved = businessHoursRepository.save(bh);

        auditService.log("BusinessHours", String.valueOf(saved.getId()),
                "BUSINESS_HOURS_CREATED", actor,
                "Horaires créés: " + saved.getName() + " (" + saved.getStartHour() + "h-" + saved.getEndHour() + "h)",
                httpRequest.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Modifier un horaire ouvré")
    public ResponseEntity<BusinessHoursResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody BusinessHoursRequest request,
            @AuthenticationPrincipal User actor,
            HttpServletRequest httpRequest) {
        BusinessHours bh = businessHoursRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Horaire introuvable"));

        bh.setName(request.getName());
        bh.setStartHour(request.getStartHour());
        bh.setEndHour(request.getEndHour());
        bh.setWorkDays(request.getWorkDays());
        if (request.getTimezone() != null) bh.setTimezone(request.getTimezone());
        if (request.getIsDefault() != null) bh.setIsDefault(request.getIsDefault());
        if (request.getActive() != null) bh.setActive(request.getActive());

        BusinessHours saved = businessHoursRepository.save(bh);

        auditService.log("BusinessHours", String.valueOf(id),
                "BUSINESS_HOURS_UPDATED", actor,
                "Horaires modifiés: " + saved.getName(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(mapToResponse(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un horaire ouvré")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User actor,
            HttpServletRequest httpRequest) {
        BusinessHours bh = businessHoursRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Horaire introuvable"));

        auditService.log("BusinessHours", String.valueOf(id),
                "BUSINESS_HOURS_DELETED", actor,
                "Horaires supprimés: " + bh.getName(),
                httpRequest.getRemoteAddr());

        businessHoursRepository.delete(bh);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // MAPPER
    // =========================================================================

    private BusinessHoursResponse mapToResponse(BusinessHours bh) {
        return BusinessHoursResponse.builder()
                .id(bh.getId())
                .name(bh.getName())
                .startHour(bh.getStartHour())
                .endHour(bh.getEndHour())
                .workDays(bh.getWorkDays())
                .timezone(bh.getTimezone())
                .isDefault(bh.getIsDefault())
                .active(bh.getActive())
                .createdAt(bh.getCreatedAt())
                .updatedAt(bh.getUpdatedAt())
                .build();
    }
}
