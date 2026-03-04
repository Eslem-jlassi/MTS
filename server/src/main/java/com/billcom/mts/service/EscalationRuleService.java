package com.billcom.mts.service;

import com.billcom.mts.dto.sla.EscalationRuleRequest;
import com.billcom.mts.dto.sla.EscalationRuleResponse;
import com.billcom.mts.entity.User;

import java.util.List;

/**
 * Service CRUD pour les règles d'escalade.
 */
public interface EscalationRuleService {

    List<EscalationRuleResponse> listAll(boolean enabledOnly);

    EscalationRuleResponse getById(Long id);

    long countEnabled();

    EscalationRuleResponse create(EscalationRuleRequest request, User actor, String ipAddress);

    EscalationRuleResponse update(Long id, EscalationRuleRequest request, User actor, String ipAddress);

    void delete(Long id, User actor, String ipAddress);
}
