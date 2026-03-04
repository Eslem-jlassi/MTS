package com.billcom.mts.controller;

import com.billcom.mts.dto.sla.*;
import com.billcom.mts.entity.SlaTimeline;
import com.billcom.mts.entity.User;
import com.billcom.mts.repository.EscalationRuleRepository;
import com.billcom.mts.repository.SlaTimelineRepository;
import com.billcom.mts.repository.TicketRepository;
import com.billcom.mts.service.EscalationEngineService;
import com.billcom.mts.service.EscalationRuleService;
import com.billcom.mts.service.TicketService;
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

import java.util.List;
import java.util.stream.Collectors;

/**
 * Contrôleur REST pour la page "SLA & Escalade".
 *
 * Endpoints :
 * - GET  /api/sla-escalation/stats         → KPIs globaux
 * - GET  /api/sla-escalation/timeline/:id   → Historique SLA d'un ticket
 * - GET  /api/sla-escalation/rules          → Liste des règles d'escalade
 * - POST /api/sla-escalation/rules          → Créer une règle
 * - PUT  /api/sla-escalation/rules/:id      → Modifier une règle
 * - DEL  /api/sla-escalation/rules/:id      → Supprimer une règle
 * - POST /api/sla-escalation/evaluate       → Forcer une évaluation manuelle
 */
@Slf4j
@RestController
@RequestMapping("/api/sla-escalation")
@RequiredArgsConstructor
@Tag(name = "SLA & Escalade", description = "KPIs SLA, historique, règles d'escalade automatique")
public class SlaEscalationController {

    private final TicketRepository ticketRepository;
    private final EscalationRuleRepository escalationRuleRepository;
    private final SlaTimelineRepository slaTimelineRepository;
    private final EscalationRuleService escalationRuleService;
    private final EscalationEngineService escalationEngineService;
    private final TicketService ticketService;

    // =========================================================================
    // KPIs
    // =========================================================================

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "KPIs SLA & Escalade",
               description = "Taux de conformité, tickets à risque/dépassés, escaladés, règles actives")
    public ResponseEntity<SlaEscalationStats> getStats() {
        long activeCount = ticketRepository.findActiveTickets().size();
        long breachedCount = ticketRepository.countSlaBreached();
        long atRiskCount = ticketRepository.findActiveTickets().stream()
                .filter(t -> !Boolean.TRUE.equals(t.getBreachedSla()))
                .filter(t -> t.getSlaPercentageUsed() >= 80)
                .filter(t -> t.getSlaPercentageUsed() < 100)
                .count();
        long escalatedCount = ticketRepository.findActiveTickets().stream()
                .filter(t -> t.getEscalationLevel() != null && t.getEscalationLevel() > 0)
                .count();

        double complianceRate = ticketService.getSlaComplianceRate();
        Double avgResolution = ticketService.getAverageResolutionTimeHours();

        SlaEscalationStats stats = SlaEscalationStats.builder()
                .complianceRate(complianceRate)
                .atRiskCount(atRiskCount)
                .breachedCount(breachedCount)
                .activeCount(activeCount)
                .escalatedCount(escalatedCount)
                .activeRulesCount(escalationRuleRepository.countByEnabledTrue())
                .averageResolutionHours(avgResolution != null ? avgResolution : 0)
                .build();

        return ResponseEntity.ok(stats);
    }

    // =========================================================================
    // TIMELINE SLA (historique d'un ticket)
    // =========================================================================

    @GetMapping("/timeline/{ticketId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Historique SLA d'un ticket",
               description = "Liste chronologique des événements SLA (pause, reprise, breach, escalade…)")
    public ResponseEntity<List<SlaTimelineResponse>> getTicketTimeline(@PathVariable Long ticketId) {
        List<SlaTimeline> events = slaTimelineRepository.findByTicket_IdOrderByCreatedAtDesc(ticketId);
        List<SlaTimelineResponse> response = events.stream()
                .map(e -> SlaTimelineResponse.builder()
                        .id(e.getId())
                        .ticketId(e.getTicket().getId())
                        .ticketNumber(e.getTicket().getTicketNumber())
                        .eventType(e.getEventType())
                        .oldValue(e.getOldValue())
                        .newValue(e.getNewValue())
                        .details(e.getDetails())
                        .pausedMinutes(e.getPausedMinutes())
                        .createdAt(e.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // CRUD RÈGLES D'ESCALADE
    // =========================================================================

    @GetMapping("/rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Liste des règles d'escalade")
    public ResponseEntity<List<EscalationRuleResponse>> listRules(
            @RequestParam(defaultValue = "false") boolean enabledOnly) {
        return ResponseEntity.ok(escalationRuleService.listAll(enabledOnly));
    }

    @GetMapping("/rules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Détail d'une règle d'escalade")
    public ResponseEntity<EscalationRuleResponse> getRule(@PathVariable Long id) {
        return ResponseEntity.ok(escalationRuleService.getById(id));
    }

    @PostMapping("/rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Créer une règle d'escalade")
    public ResponseEntity<EscalationRuleResponse> createRule(
            @Valid @RequestBody EscalationRuleRequest request,
            @AuthenticationPrincipal User actor,
            HttpServletRequest httpRequest) {
        EscalationRuleResponse created = escalationRuleService.create(
                request, actor, httpRequest.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/rules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Modifier une règle d'escalade")
    public ResponseEntity<EscalationRuleResponse> updateRule(
            @PathVariable Long id,
            @Valid @RequestBody EscalationRuleRequest request,
            @AuthenticationPrincipal User actor,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(escalationRuleService.update(
                id, request, actor, httpRequest.getRemoteAddr()));
    }

    @DeleteMapping("/rules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Supprimer une règle d'escalade")
    public ResponseEntity<Void> deleteRule(
            @PathVariable Long id,
            @AuthenticationPrincipal User actor,
            HttpServletRequest httpRequest) {
        escalationRuleService.delete(id, actor, httpRequest.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // ÉVALUATION MANUELLE
    // =========================================================================

    @PostMapping("/evaluate")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Forcer une évaluation d'escalade",
               description = "Exécute manuellement le moteur d'escalade sur tous les tickets actifs")
    public ResponseEntity<java.util.Map<String, Object>> forceEvaluation() {
        int count = escalationEngineService.evaluateAll();
        return ResponseEntity.ok(java.util.Map.of(
                "escalatedCount", count,
                "message", count > 0
                        ? count + " ticket(s) escaladé(s)"
                        : "Aucune escalade nécessaire"
        ));
    }
}
