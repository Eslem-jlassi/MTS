package com.billcom.mts.service.impl;

import com.billcom.mts.dto.sla.EscalationRuleRequest;
import com.billcom.mts.dto.sla.EscalationRuleResponse;
import com.billcom.mts.entity.EscalationRule;
import com.billcom.mts.entity.User;
import com.billcom.mts.repository.EscalationRuleRepository;
import com.billcom.mts.repository.UserRepository;
import com.billcom.mts.service.AuditService;
import com.billcom.mts.service.EscalationRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation CRUD des règles d'escalade.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EscalationRuleServiceImpl implements EscalationRuleService {

    private final EscalationRuleRepository ruleRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Override
    public List<EscalationRuleResponse> listAll(boolean enabledOnly) {
        List<EscalationRule> rules = enabledOnly
                ? ruleRepository.findByEnabledTrueOrderBySortOrderAsc()
                : ruleRepository.findAllByOrderBySortOrderAsc();
        return rules.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public EscalationRuleResponse getById(Long id) {
        return mapToResponse(findByIdOrThrow(id));
    }

    @Override
    public long countEnabled() {
        return ruleRepository.countByEnabledTrue();
    }

    @Override
    @Transactional
    public EscalationRuleResponse create(EscalationRuleRequest request, User actor, String ipAddress) {
        EscalationRule rule = EscalationRule.builder()
                .name(request.getName())
                .description(request.getDescription())
                .triggerType(request.getTriggerType())
                .thresholdPercent(request.getThresholdPercent())
                .escalationLevel(request.getEscalationLevel())
                .notifyRoles(request.getNotifyRoles())
                .changePriority(request.getChangePriority())
                .enabled(request.getEnabled() != null ? request.getEnabled() : true)
                .priorityFilter(request.getPriorityFilter())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .build();

        // Auto-assign user
        if (request.getAutoAssignToId() != null) {
            rule.setAutoAssignTo(userRepository.findById(request.getAutoAssignToId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Utilisateur auto-assign introuvable")));
        }

        EscalationRule saved = ruleRepository.save(rule);

        auditService.log("EscalationRule", String.valueOf(saved.getId()),
                "ESCALATION_RULE_CREATED", actor,
                "Règle créée: " + saved.getName() + " (trigger=" + saved.getTriggerType() + ")",
                ipAddress);

        log.info("Règle d'escalade créée: {} (ID {})", saved.getName(), saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public EscalationRuleResponse update(Long id, EscalationRuleRequest request, User actor, String ipAddress) {
        EscalationRule rule = findByIdOrThrow(id);

        rule.setName(request.getName());
        rule.setDescription(request.getDescription());
        rule.setTriggerType(request.getTriggerType());
        rule.setThresholdPercent(request.getThresholdPercent());
        rule.setEscalationLevel(request.getEscalationLevel());
        rule.setNotifyRoles(request.getNotifyRoles());
        rule.setChangePriority(request.getChangePriority());
        rule.setPriorityFilter(request.getPriorityFilter());
        if (request.getEnabled() != null) rule.setEnabled(request.getEnabled());
        if (request.getSortOrder() != null) rule.setSortOrder(request.getSortOrder());

        if (request.getAutoAssignToId() != null) {
            rule.setAutoAssignTo(userRepository.findById(request.getAutoAssignToId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Utilisateur auto-assign introuvable")));
        } else {
            rule.setAutoAssignTo(null);
        }

        EscalationRule saved = ruleRepository.save(rule);

        auditService.log("EscalationRule", String.valueOf(saved.getId()),
                "ESCALATION_RULE_UPDATED", actor,
                "Règle modifiée: " + saved.getName(),
                ipAddress);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id, User actor, String ipAddress) {
        EscalationRule rule = findByIdOrThrow(id);

        auditService.log("EscalationRule", String.valueOf(id),
                "ESCALATION_RULE_DELETED", actor,
                "Règle supprimée: " + rule.getName(),
                ipAddress);

        ruleRepository.delete(rule);
        log.info("Règle d'escalade supprimée: {} (ID {})", rule.getName(), id);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private EscalationRule findByIdOrThrow(Long id) {
        return ruleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Règle d'escalade introuvable: " + id));
    }

    private EscalationRuleResponse mapToResponse(EscalationRule rule) {
        return EscalationRuleResponse.builder()
                .id(rule.getId())
                .name(rule.getName())
                .description(rule.getDescription())
                .triggerType(rule.getTriggerType())
                .thresholdPercent(rule.getThresholdPercent())
                .escalationLevel(rule.getEscalationLevel())
                .autoAssignToId(rule.getAutoAssignTo() != null ? rule.getAutoAssignTo().getId() : null)
                .autoAssignToName(rule.getAutoAssignTo() != null
                        ? rule.getAutoAssignTo().getFirstName() + " " + rule.getAutoAssignTo().getLastName()
                        : null)
                .notifyRoles(rule.getNotifyRoles())
                .changePriority(rule.getChangePriority())
                .enabled(rule.getEnabled())
                .priorityFilter(rule.getPriorityFilter())
                .sortOrder(rule.getSortOrder())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }
}
