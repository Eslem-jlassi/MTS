package com.billcom.mts.service.impl;

import com.billcom.mts.dto.sla.SlaPolicyRequest;
import com.billcom.mts.dto.sla.SlaPolicyResponse;
import com.billcom.mts.entity.BusinessHours;
import com.billcom.mts.entity.SlaConfig;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.User;
import com.billcom.mts.exception.ConflictException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.BusinessHoursRepository;
import com.billcom.mts.repository.SlaConfigRepository;
import com.billcom.mts.repository.TelecomServiceRepository;
import com.billcom.mts.service.AuditService;
import com.billcom.mts.service.SlaPolicyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service de gestion des politiques SLA.
 * <p>
 * Chaque opération d'écriture (create/update/delete) :
 * - Valide les données d'entrée (doublons, existence service)
 * - Persiste les modifications
 * - Enregistre une entrée d'audit via {@link AuditService}
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SlaPolicyServiceImpl implements SlaPolicyService {

    private final SlaConfigRepository slaConfigRepository;
    private final TelecomServiceRepository telecomServiceRepository;
    private final BusinessHoursRepository businessHoursRepository;
    private final AuditService auditService;

    // =========================================================================
    // LECTURE
    // =========================================================================

    @Override
    public List<SlaPolicyResponse> listAll(boolean activeOnly) {
        List<SlaConfig> policies = activeOnly
                ? slaConfigRepository.findByActiveTrueOrderByPriorityAsc()
                : slaConfigRepository.findAllByOrderByPriorityAsc();

        return policies.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public SlaPolicyResponse getById(Long id) {
        SlaConfig policy = findByIdOrThrow(id);
        return mapToResponse(policy);
    }

    @Override
    public long countActive() {
        return slaConfigRepository.countByActiveTrue();
    }

    // =========================================================================
    // ÉCRITURE
    // =========================================================================

    @Override
    @Transactional
    public SlaPolicyResponse create(SlaPolicyRequest request, User actor, String ipAddress) {
        // Vérifier l'unicité du nom
        if (slaConfigRepository.existsByNameIgnoreCase(request.getName())) {
            throw new ConflictException("Une politique SLA avec le nom '" + request.getName() + "' existe déjà");
        }

        // Résoudre le service optionnel
        TelecomService service = resolveService(request.getServiceId());

        // Résoudre les horaires ouvrés optionnels
        BusinessHours businessHours = resolveBusinessHours(request.getBusinessHoursId());

        // Construire l'entité
        SlaConfig policy = SlaConfig.builder()
                .name(request.getName())
                .description(request.getDescription())
                .priority(request.getPriority())
                .slaHours(request.getResolutionTimeHours())
                .responseTimeHours(request.getResponseTimeHours())
                .service(service)
                .businessHours(businessHours)
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        policy = slaConfigRepository.save(policy);
        log.info("SLA Policy created: {} (id={})", policy.getName(), policy.getId());

        // Audit
        auditService.log(
                "SLA",
                String.valueOf(policy.getId()),
                "SLA_POLICY_CREATED",
                actor,
                "Nouvelle politique SLA : " + policy.getName()
                    + " (priorité=" + policy.getPriority()
                    + ", résolution=" + policy.getSlaHours() + "h"
                    + (policy.getResponseTimeHours() != null ? ", réponse=" + policy.getResponseTimeHours() + "h" : "")
                    + ")",
                ipAddress
        );

        return mapToResponse(policy);
    }

    @Override
    @Transactional
    public SlaPolicyResponse update(Long id, SlaPolicyRequest request, User actor, String ipAddress) {
        SlaConfig policy = findByIdOrThrow(id);
        String oldName = policy.getName();

        // Vérifier l'unicité du nom (exclure l'entité courante)
        if (slaConfigRepository.existsByNameIgnoreCaseAndIdNot(request.getName(), id)) {
            throw new ConflictException("Une politique SLA avec le nom '" + request.getName() + "' existe déjà");
        }

        // Résoudre le service optionnel
        TelecomService service = resolveService(request.getServiceId());

        // Résoudre les horaires ouvrés optionnels
        BusinessHours businessHours = resolveBusinessHours(request.getBusinessHoursId());

        // Mettre à jour les champs
        policy.setName(request.getName());
        policy.setDescription(request.getDescription());
        policy.setPriority(request.getPriority());
        policy.setSlaHours(request.getResolutionTimeHours());
        policy.setResponseTimeHours(request.getResponseTimeHours());
        policy.setService(service);
        policy.setBusinessHours(businessHours);
        if (request.getActive() != null) {
            policy.setActive(request.getActive());
        }

        policy = slaConfigRepository.save(policy);
        log.info("SLA Policy updated: {} (id={})", policy.getName(), policy.getId());

        // Audit
        auditService.log(
                "SLA",
                String.valueOf(policy.getId()),
                "SLA_POLICY_UPDATED",
                actor,
                "Politique SLA modifiée : " + oldName + " → " + policy.getName(),
                ipAddress
        );

        return mapToResponse(policy);
    }

    @Override
    @Transactional
    public void delete(Long id, User actor, String ipAddress) {
        SlaConfig policy = findByIdOrThrow(id);
        String policyName = policy.getName();

        slaConfigRepository.delete(policy);
        log.info("SLA Policy deleted: {} (id={})", policyName, id);

        // Audit
        auditService.log(
                "SLA",
                String.valueOf(id),
                "SLA_POLICY_DELETED",
                actor,
                "Politique SLA supprimée : " + policyName,
                ipAddress
        );
    }

    // =========================================================================
    // MÉTHODES PRIVÉES
    // =========================================================================

    /**
     * Recherche une politique SLA par ID ou lève une exception 404.
     */
    private SlaConfig findByIdOrThrow(Long id) {
        return slaConfigRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SlaPolicy", "id", id));
    }

    /**
     * Résout le service optionnel à partir de son ID.
     *
     * @param serviceId ID du service (peut être null)
     * @return le service trouvé ou null si serviceId est null
     * @throws ResourceNotFoundException si le service n'existe pas
     */
    private TelecomService resolveService(Long serviceId) {
        if (serviceId == null) {
            return null;
        }
        return telecomServiceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));
    }

    /**
     * Résout les horaires ouvrés optionnels à partir de leur ID.
     *
     * @param businessHoursId ID des horaires (peut être null)
     * @return les horaires trouvés ou null si businessHoursId est null
     * @throws ResourceNotFoundException si les horaires n'existent pas
     */
    private BusinessHours resolveBusinessHours(Long businessHoursId) {
        if (businessHoursId == null) {
            return null;
        }
        return businessHoursRepository.findById(businessHoursId)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessHours", "id", businessHoursId));
    }

    /**
     * Convertit une entité SlaConfig en DTO de réponse.
     */
    private SlaPolicyResponse mapToResponse(SlaConfig policy) {
        return SlaPolicyResponse.builder()
                .id(policy.getId())
                .name(policy.getName())
                .description(policy.getDescription())
                .priority(policy.getPriority())
                .resolutionTimeHours(policy.getSlaHours())
                .responseTimeHours(policy.getResponseTimeHours())
                .serviceId(policy.getService() != null ? policy.getService().getId() : null)
                .serviceName(policy.getService() != null ? policy.getService().getName() : null)
                .businessHoursId(policy.getBusinessHours() != null ? policy.getBusinessHours().getId() : null)
                .businessHoursName(policy.getBusinessHours() != null ? policy.getBusinessHours().getName() : null)
                .active(policy.getActive())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }
}
