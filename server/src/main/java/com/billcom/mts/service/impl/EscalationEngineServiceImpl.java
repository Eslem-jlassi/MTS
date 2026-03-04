package com.billcom.mts.service.impl;

import com.billcom.mts.entity.*;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.repository.*;
import com.billcom.mts.service.AuditService;
import com.billcom.mts.service.EscalationEngineService;
import com.billcom.mts.service.NotificationService;
import com.billcom.mts.service.SlaCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Implémentation du moteur d'escalade automatique.
 *
 * <h3>Fonctionnement :</h3>
 * <ol>
 *   <li>Récupère tous les tickets actifs</li>
 *   <li>Pour chaque ticket, évalue les règles d'escalade (AT_RISK, BREACHED)</li>
 *   <li>Applique les actions: changement de priorité, assignation, notification, escalation_level</li>
 *   <li>Trace tout dans l'audit log et la SLA timeline</li>
 * </ol>
 *
 * Le moteur tourne toutes les 5 minutes via {@code @Scheduled}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EscalationEngineServiceImpl implements EscalationEngineService {

    private final TicketRepository ticketRepository;
    private final EscalationRuleRepository escalationRuleRepository;
    private final SlaConfigRepository slaConfigRepository;
    private final BusinessHoursRepository businessHoursRepository;
    private final UserRepository userRepository;
    private final SlaTimelineRepository slaTimelineRepository;
    private final SlaCalculationService slaCalculationService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    // =========================================================================
    // POINT D'ENTRÉE SCHEDULER (toutes les 5 minutes)
    // =========================================================================

    /**
     * Job planifié : évalue les règles d'escalade sur les tickets actifs.
     */
    @Override
    @Scheduled(fixedRate = 300_000) // 5 minutes
    @Transactional
    public int evaluateAll() {
        try {
            log.debug("⏱ Démarrage du moteur d'escalade automatique…");

            List<Ticket> activeTickets = ticketRepository.findActiveTickets();
            List<EscalationRule> atRiskRules = escalationRuleRepository
                    .findByTriggerTypeAndEnabledTrueOrderBySortOrderAsc("AT_RISK");
            List<EscalationRule> breachedRules = escalationRuleRepository
                    .findByTriggerTypeAndEnabledTrueOrderBySortOrderAsc("BREACHED");

            int escalatedCount = 0;

            for (Ticket ticket : activeTickets) {
                try {
                    // Résoudre les business hours depuis la SLA config du ticket
                    BusinessHours bh = resolveBusinessHours(ticket);
                    double pct = slaCalculationService.calculateEffectivePercentage(ticket, bh);

                    // ---- BREACHED (priorité haute) ----
                    if (pct >= 100) {
                        boolean applied = applyRules(ticket, breachedRules, pct, bh, "BREACHED");
                        if (applied) escalatedCount++;
                        continue;
                    }

                    // ---- AT_RISK ----
                    for (EscalationRule rule : atRiskRules) {
                        int threshold = rule.getThresholdPercent() != null ? rule.getThresholdPercent() : 80;
                        if (pct >= threshold && ticket.getEscalationLevel() < rule.getEscalationLevel()) {
                            if (rule.matchesPriority(ticket.getPriority())) {
                                applyRule(ticket, rule, pct, "AT_RISK");
                                escalatedCount++;
                                break; // Une seule règle AT_RISK par évaluation
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Erreur lors de l'évaluation du ticket {} : {}",
                            ticket.getTicketNumber(), e.getMessage());
                }
            }

            if (escalatedCount > 0) {
                log.info("🔺 Escalade automatique appliquée à {} ticket(s)", escalatedCount);
            } else {
                log.debug("✅ Aucune escalade nécessaire");
            }

            return escalatedCount;

        } catch (Exception e) {
            log.error("❌ Erreur dans le moteur d'escalade (le job continuera)", e);
            return 0;
        }
    }

    // =========================================================================
    // APPLICATION DES RÈGLES
    // =========================================================================

    /**
     * Applique toutes les règles correspondant au trigger sur un ticket.
     */
    private boolean applyRules(Ticket ticket, List<EscalationRule> rules,
                                double pct, BusinessHours bh, String triggerType) {
        boolean applied = false;
        for (EscalationRule rule : rules) {
            if (ticket.getEscalationLevel() >= rule.getEscalationLevel()) continue;
            if (!rule.matchesPriority(ticket.getPriority())) continue;

            applyRule(ticket, rule, pct, triggerType);
            applied = true;
        }
        return applied;
    }

    /**
     * Applique une règle d'escalade individuelle sur un ticket.
     */
    private void applyRule(Ticket ticket, EscalationRule rule, double pct, String triggerType) {
        String ticketNum = ticket.getTicketNumber();
        log.info("⬆ Escalade ticket {} : règle '{}' (niveau {}), SLA {}%",
                ticketNum, rule.getName(), rule.getEscalationLevel(), Math.round(pct));

        int oldLevel = ticket.getEscalationLevel();
        ticket.setEscalationLevel(rule.getEscalationLevel());

        // --- Changer le statut en ESCALATED si pas déjà ---
        if (ticket.getStatus() != TicketStatus.ESCALATED
                && ticket.getStatus() != TicketStatus.RESOLVED
                && ticket.getStatus() != TicketStatus.CLOSED
                && ticket.getStatus() != TicketStatus.CANCELLED) {
            ticket.setStatus(TicketStatus.ESCALATED);
        }

        // --- Marquer SLA breach si dépassé ---
        if ("BREACHED".equals(triggerType)) {
            ticket.setBreachedSla(true);
        }

        // --- Changer la priorité si configuré ---
        if (rule.getChangePriority() != null && !rule.getChangePriority().isBlank()) {
            try {
                TicketPriority newPriority = TicketPriority.valueOf(rule.getChangePriority());
                if (newPriority != ticket.getPriority()) {
                    log.info("  → Priorité changée : {} → {}", ticket.getPriority(), newPriority);
                    ticket.setPriority(newPriority);
                }
            } catch (IllegalArgumentException e) {
                log.warn("Priorité invalide dans la règle d'escalade : {}", rule.getChangePriority());
            }
        }

        // --- Auto-assigner si configuré ---
        if (rule.getAutoAssignTo() != null) {
            ticket.setAssignedTo(rule.getAutoAssignTo());
            log.info("  → Auto-assigné à l'utilisateur ID {}", rule.getAutoAssignTo().getId());
        }

        ticketRepository.save(ticket);

        // --- Enregistrer dans la timeline SLA ---
        SlaTimeline event = SlaTimeline.builder()
                .ticket(ticket)
                .eventType("ESCALATED")
                .oldValue("niveau " + oldLevel)
                .newValue("niveau " + rule.getEscalationLevel())
                .details("Règle: " + rule.getName() + " | Trigger: " + triggerType
                        + " | SLA: " + Math.round(pct) + "%")
                .pausedMinutes(ticket.getSlaPausedMinutes())
                .build();
        slaTimelineRepository.save(event);

        // --- Notifications ---
        sendEscalationNotifications(ticket, rule, pct, triggerType);

        // --- Audit ---
        auditService.log("Ticket", String.valueOf(ticket.getId()),
                "ESCALATION_LEVEL_" + rule.getEscalationLevel(),
                null,
                "Escalade auto: " + rule.getName() + " (SLA " + Math.round(pct) + "%, trigger=" + triggerType + ")",
                "SYSTEM");
    }

    // =========================================================================
    // NOTIFICATIONS
    // =========================================================================

    /**
     * Envoie les notifications d'escalade selon les rôles configurés dans la règle.
     */
    private void sendEscalationNotifications(Ticket ticket, EscalationRule rule,
                                               double pct, String triggerType) {
        try {
            // Notification SLA breach ou warning standard
            if ("BREACHED".equals(triggerType)) {
                notificationService.notifySlaBreach(ticket);
            } else {
                notificationService.notifySlaWarning(ticket, (int) pct);
            }

            // Notification aux rôles supplémentaires configurés
            if (rule.getNotifyRoles() != null && !rule.getNotifyRoles().isBlank()) {
                Set<String> roleNames = Arrays.stream(rule.getNotifyRoles().split(","))
                        .map(String::trim)
                        .collect(Collectors.toSet());

                for (String roleName : roleNames) {
                    try {
                        UserRole role2 = UserRole.valueOf(roleName);
                        List<User> users = userRepository.findByRole(role2);
                        for (User ignored : users) {
                            notificationService.notifySlaWarning(ticket, (int) pct);
                        }
                        log.debug("  → Notification envoyée aux {} ({} utilisateurs)",
                                roleName, users.size());
                    } catch (IllegalArgumentException e) {
                        log.warn("Rôle inconnu dans la règle d'escalade : {}", roleName);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Erreur lors de l'envoi des notifications d'escalade pour {} : {}",
                    ticket.getTicketNumber(), e.getMessage());
        }
    }

    // =========================================================================
    // UTILITAIRES
    // =========================================================================

    /**
     * Résout les horaires ouvrés associés au SLA d'un ticket.
     * Chaîne de résolution : SlaConfig par priorité+service → SlaConfig par priorité → défaut.
     */
    private BusinessHours resolveBusinessHours(Ticket ticket) {
        Long serviceId = ticket.getService() != null ? ticket.getService().getId() : null;
        TicketPriority priority = ticket.getPriority();

        // 1. SlaConfig spécifique au service
        if (serviceId != null) {
            var config = slaConfigRepository.findByPriorityAndService_Id(priority, serviceId);
            if (config.isPresent() && config.get().getBusinessHours() != null) {
                return config.get().getBusinessHours();
            }
        }

        // 2. SlaConfig globale (service = null)
        var globalConfig = slaConfigRepository.findByPriorityAndServiceIsNull(priority);
        if (globalConfig.isPresent() && globalConfig.get().getBusinessHours() != null) {
            return globalConfig.get().getBusinessHours();
        }

        // 3. Business hours par défaut
        return businessHoursRepository.findByIsDefaultTrueAndActiveTrue().orElse(null);
    }
}
