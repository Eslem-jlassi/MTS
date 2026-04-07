package com.billcom.mts.service.impl;

import com.billcom.mts.dto.incident.*;
import com.billcom.mts.dto.security.AdminHardDeleteRequest;
import com.billcom.mts.entity.*;
import com.billcom.mts.enums.*;
import com.billcom.mts.exception.ForbiddenException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.*;
import com.billcom.mts.service.IncidentService;
import com.billcom.mts.service.SensitiveActionVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncidentServiceImpl implements IncidentService {

    private final IncidentRepository incidentRepository;
    private final TelecomServiceRepository telecomServiceRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final IncidentTimelineRepository timelineRepository;
    private final com.billcom.mts.service.AuditService auditService;
    private final SensitiveActionVerificationService sensitiveActionVerificationService;

    // =========================================================================
    // CRUD
    // =========================================================================

    @Override
    @Transactional
    public IncidentResponse create(IncidentRequest request, User currentUser) {
        ensureStaff(currentUser);

        TelecomService service = telecomServiceRepository.findById(request.getServiceId())
            .orElseThrow(() -> new ResourceNotFoundException("Service", "id", request.getServiceId()));

        // Generate incident number
        String incidentNumber = generateIncidentNumber();

        Incident incident = Incident.builder()
            .incidentNumber(incidentNumber)
            .title(request.getTitle())
            .description(request.getDescription())
            .severity(request.getSeverity())
            .impact(request.getImpact() != null ? request.getImpact() : IncidentImpact.LOCALIZED)
            .status(request.getStatus() != null ? request.getStatus() : IncidentStatus.OPEN)
            .service(service)
            .startedAt(request.getStartedAt())
            .resolvedAt(request.getResolvedAt())
            .cause(request.getCause())
            .build();

        // Legacy single ticket
        if (request.getTicketId() != null) {
            incident.setTicket(ticketRepository.findById(request.getTicketId()).orElse(null));
        }

        // Commander
        if (request.getCommanderId() != null) {
            User commander = userRepository.findById(request.getCommanderId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getCommanderId()));
            incident.setCommander(commander);
        }

        incident = incidentRepository.save(incident);

        // Link tickets (many-to-many)
        if (request.getTicketIds() != null && !request.getTicketIds().isEmpty()) {
            for (Long ticketId : request.getTicketIds()) {
                Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
                if (ticket != null) {
                    incident.getTickets().add(ticket);
                }
            }
            incident = incidentRepository.save(incident);
        }

        // Link affected services
        if (request.getAffectedServiceIds() != null && !request.getAffectedServiceIds().isEmpty()) {
            for (Long svcId : request.getAffectedServiceIds()) {
                TelecomService svc = telecomServiceRepository.findById(svcId).orElse(null);
                if (svc != null) {
                    incident.getAffectedServices().add(svc);
                }
            }
            incident = incidentRepository.save(incident);
        }

        // Timeline: creation event
        addTimelineEntry(incident, IncidentTimelineEventType.STATUS_CHANGE,
            "Incident créé", null, IncidentStatus.OPEN.name(), currentUser);

        log.info("Incident {} created by {}", incidentNumber, currentUser.getEmail());
        return toResponse(incident);
    }

    @Override
    @Transactional
    public IncidentResponse update(Long id, IncidentRequest request, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        // Track status change
        IncidentStatus oldStatus = incident.getStatus();

        incident.setTitle(request.getTitle());
        if (request.getDescription() != null) incident.setDescription(request.getDescription());
        incident.setSeverity(request.getSeverity());
        if (request.getImpact() != null) incident.setImpact(request.getImpact());
        if (request.getStatus() != null) incident.setStatus(request.getStatus());
        incident.setStartedAt(request.getStartedAt());
        incident.setResolvedAt(request.getResolvedAt());
        incident.setCause(request.getCause());

        // Service principal
        if (request.getServiceId() != null && !request.getServiceId().equals(incident.getService().getId())) {
            TelecomService service = telecomServiceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", request.getServiceId()));
            incident.setService(service);
        }

        // Legacy ticket
        if (request.getTicketId() != null) {
            incident.setTicket(ticketRepository.findById(request.getTicketId()).orElse(null));
        }

        // Commander
        if (request.getCommanderId() != null) {
            User commander = userRepository.findById(request.getCommanderId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getCommanderId()));
            incident.setCommander(commander);
        }

        incident = incidentRepository.save(incident);

        // Timeline: status change
        if (request.getStatus() != null && oldStatus != request.getStatus()) {
            addTimelineEntry(incident, IncidentTimelineEventType.STATUS_CHANGE,
                "Statut modifié", oldStatus.name(), request.getStatus().name(), currentUser);
        }

        return toResponse(incident);
    }

    @Override
    public IncidentResponse getById(Long id, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));
        return toResponse(incident);
    }

    @Override
    @Transactional
    public void hardDeleteIncidentAsAdmin(
            Long id,
            User currentUser,
            String ipAddress,
            AdminHardDeleteRequest request) {
        log.info("Tentative de SUPPRESSION DEFINITIVE de l'incident ID: {} par admin: {} depuis IP: {}", 
                 id, currentUser.getEmail(), ipAddress);

        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        sensitiveActionVerificationService.verifyHardDeleteAuthorization(
                currentUser,
                id,
                request,
                "suppression definitive de l'incident " + incident.getIncidentNumber()
        );

        String incidentNumber = incident.getIncidentNumber();
        String deletionSnapshot = buildHardDeleteSnapshot(incident, currentUser);

        try {
            auditService.log("Incident", id.toString(), "DELETE", currentUser,
                "Suppression definitive " + incidentNumber + " | " + deletionSnapshot, ipAddress);
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }

        // Casser les relations ManyToMany proprement pour eviter les problemes de contraintes
        incident.getTickets().clear();
        incident.getAffectedServices().clear();
        incidentRepository.saveAndFlush(incident);

        incidentRepository.delete(incident);
    }

    @Override
    @Transactional
    public void issueHardDeleteChallenge(Long id, User currentUser, String ipAddress) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        sensitiveActionVerificationService.issueHardDeleteVerificationCode(
                currentUser,
                "la suppression definitive de l'incident " + incident.getIncidentNumber()
        );

        try {
            auditService.log(
                    "Incident",
                    id.toString(),
                    "UPDATE",
                    currentUser,
                    "Challenge de verification emis avant suppression definitive de l'incident "
                            + incident.getIncidentNumber(),
                    ipAddress
            );
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }
    }

    @Override
    public Page<IncidentResponse> findAll(Pageable pageable, User currentUser) {
        ensureStaff(currentUser);
        return incidentRepository.findAll(pageable).map(this::toResponse);
    }

    @Override
    public Page<IncidentResponse> findByServiceId(Long serviceId, Pageable pageable, User currentUser) {
        ensureStaff(currentUser);
        return incidentRepository.findByServiceId(serviceId, pageable).map(this::toResponse);
    }

    @Override
    public List<IncidentResponse> findActive(User currentUser) {
        ensureStaff(currentUser);
        return incidentRepository.findActive().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public long countActive() {
        return incidentRepository.countByStatus(IncidentStatus.OPEN)
            + incidentRepository.countByStatus(IncidentStatus.IN_PROGRESS);
    }

    @Override
    public Page<IncidentResponse> findFiltered(IncidentStatus status, Severity severity, Long serviceId,
                                                Pageable pageable, User currentUser) {
        ensureStaff(currentUser);
        return incidentRepository.findFiltered(status, severity, serviceId, pageable)
            .map(this::toResponse);
    }

    // =========================================================================
    // STATUS MANAGEMENT
    // =========================================================================

    @Override
    @Transactional
    public IncidentResponse changeStatus(Long id, IncidentStatus newStatus, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        IncidentStatus oldStatus = incident.getStatus();
        if (oldStatus == newStatus) return toResponse(incident);

        incident.setStatus(newStatus);

        // Auto-set resolvedAt
        if ((newStatus == IncidentStatus.RESOLVED || newStatus == IncidentStatus.CLOSED) 
            && incident.getResolvedAt() == null) {
            incident.setResolvedAt(LocalDateTime.now());
        }

        incident = incidentRepository.save(incident);

        addTimelineEntry(incident, IncidentTimelineEventType.STATUS_CHANGE,
            "Statut modifié de " + oldStatus.getLabel() + " vers " + newStatus.getLabel(),
            oldStatus.name(), newStatus.name(), currentUser);

        log.info("Incident {} status: {} -> {} by {}", 
            incident.getIncidentNumber(), oldStatus, newStatus, currentUser.getEmail());
        return toResponse(incident);
    }

    @Override
    @Transactional
    public IncidentResponse close(Long id, User currentUser) {
        return changeStatus(id, IncidentStatus.CLOSED, currentUser);
    }

    // =========================================================================
    // TIMELINE & NOTES
    // =========================================================================

    @Override
    @Transactional
    public IncidentTimelineResponse addNote(Long id, IncidentNoteRequest request, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        IncidentTimeline entry = addTimelineEntry(incident, IncidentTimelineEventType.NOTE,
            request.getContent(), null, null, currentUser);

        log.info("Note added to incident {} by {}", incident.getIncidentNumber(), currentUser.getEmail());
        return mapTimelineToResponse(entry);
    }

    @Override
    public List<IncidentTimelineResponse> getTimeline(Long id, User currentUser) {
        ensureStaff(currentUser);
        if (!incidentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Incident", "id", id);
        }
        return timelineRepository.findByIncidentIdOrderByCreatedAtDesc(id).stream()
            .map(this::mapTimelineToResponse)
            .collect(Collectors.toList());
    }

    // =========================================================================
    // POST-MORTEM
    // =========================================================================

    @Override
    @Transactional
    public IncidentResponse savePostMortem(Long id, PostMortemRequest request, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        incident.setPostMortem(request.getContent());
        incident.setPostMortemAt(LocalDateTime.now());
        incident = incidentRepository.save(incident);

        addTimelineEntry(incident, IncidentTimelineEventType.POST_MORTEM,
            "Post-mortem enregistré", null, null, currentUser);

        log.info("Post-mortem saved for incident {} by {}", 
            incident.getIncidentNumber(), currentUser.getEmail());
        return toResponse(incident);
    }

    // =========================================================================
    // TICKET LINKING
    // =========================================================================

    @Override
    @Transactional
    public IncidentResponse linkTickets(Long id, List<Long> ticketIds, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        for (Long ticketId : ticketIds) {
            Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
            if (incident.getTickets().add(ticket)) {
                addTimelineEntry(incident, IncidentTimelineEventType.TICKET_LINKED,
                    "Ticket " + ticket.getTicketNumber() + " lié", null, String.valueOf(ticketId), currentUser);
            }
        }

        incident = incidentRepository.save(incident);
        return toResponse(incident);
    }

    @Override
    @Transactional
    public IncidentResponse unlinkTicket(Long id, Long ticketId, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));

        if (incident.getTickets().remove(ticket)) {
            addTimelineEntry(incident, IncidentTimelineEventType.TICKET_UNLINKED,
                "Ticket " + ticket.getTicketNumber() + " délié", String.valueOf(ticketId), null, currentUser);
        }

        incident = incidentRepository.save(incident);
        return toResponse(incident);
    }

    // =========================================================================
    // SERVICE LINKING
    // =========================================================================

    @Override
    @Transactional
    public IncidentResponse linkServices(Long id, List<Long> serviceIds, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        for (Long serviceId : serviceIds) {
            TelecomService svc = telecomServiceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));
            if (incident.getAffectedServices().add(svc)) {
                addTimelineEntry(incident, IncidentTimelineEventType.SERVICE_ADDED,
                    "Service " + svc.getName() + " ajouté", null, String.valueOf(serviceId), currentUser);
            }
        }

        incident = incidentRepository.save(incident);
        return toResponse(incident);
    }

    @Override
    @Transactional
    public IncidentResponse unlinkService(Long id, Long serviceId, User currentUser) {
        ensureStaff(currentUser);
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident", "id", id));

        TelecomService svc = telecomServiceRepository.findById(serviceId)
            .orElseThrow(() -> new ResourceNotFoundException("Service", "id", serviceId));

        if (incident.getAffectedServices().remove(svc)) {
            addTimelineEntry(incident, IncidentTimelineEventType.SERVICE_REMOVED,
                "Service " + svc.getName() + " retiré", String.valueOf(serviceId), null, currentUser);
        }

        incident = incidentRepository.save(incident);
        return toResponse(incident);
    }

    // =========================================================================
    // AFFECTED SERVICE QUERY
    // =========================================================================

    @Override
    public List<IncidentResponse> findByAffectedService(Long serviceId, User currentUser) {
        ensureStaff(currentUser);
        return incidentRepository.findByAffectedServiceId(serviceId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private String generateIncidentNumber() {
        Long maxId = incidentRepository.findMaxId();
        long next = (maxId != null ? maxId : 0) + 1;
        return String.format("INC-%05d", next);
    }

    private IncidentTimeline addTimelineEntry(Incident incident, IncidentTimelineEventType eventType,
                                                String content, String oldValue, String newValue, User author) {
        IncidentTimeline entry = IncidentTimeline.builder()
            .incident(incident)
            .eventType(eventType)
            .content(content)
            .oldValue(oldValue)
            .newValue(newValue)
            .author(author)
            .build();
        return timelineRepository.save(entry);
    }

    private void ensureStaff(User user) {
        if (user.getRole() == UserRole.CLIENT) throw new ForbiddenException("Réservé au staff");
    }

    private String buildHardDeleteSnapshot(Incident incident, User currentUser) {
        long timelineCount = timelineRepository.countByIncidentId(incident.getId());
        int linkedTicketsCount = incident.getTickets() != null ? incident.getTickets().size() : 0;
        int linkedServicesCount = incident.getAffectedServices() != null ? incident.getAffectedServices().size() : 0;

        return String.format(
                "snapshot={incidentId=%d,incidentNumber=%s,status=%s,severity=%s,serviceId=%s,"
                        + "linkedTickets=%d,linkedServices=%d,timelineCount=%d,postMortem=%s,reauthMode=%s}",
                incident.getId(),
                incident.getIncidentNumber(),
                incident.getStatus() != null ? incident.getStatus().name() : "null",
                incident.getSeverity() != null ? incident.getSeverity().name() : "null",
                incident.getService() != null ? incident.getService().getId() : null,
                linkedTicketsCount,
                linkedServicesCount,
                timelineCount,
                incident.hasPostMortem(),
                sensitiveActionVerificationService.resolveReauthMode(currentUser)
        );
    }

    // =========================================================================
    // MAPPING
    // =========================================================================

    private IncidentResponse toResponse(Incident i) {
        // Tickets linked
        List<Long> ticketIds = new ArrayList<>();
        List<String> ticketNumbers = new ArrayList<>();
        if (i.getTickets() != null) {
            for (Ticket t : i.getTickets()) {
                ticketIds.add(t.getId());
                ticketNumbers.add(t.getTicketNumber());
            }
        }

        // Affected services
        List<Long> serviceIds = new ArrayList<>();
        List<String> serviceNames = new ArrayList<>();
        if (i.getAffectedServices() != null) {
            for (TelecomService s : i.getAffectedServices()) {
                serviceIds.add(s.getId());
                serviceNames.add(s.getName());
            }
        }

        long tlCount = 0;
        try {
            tlCount = timelineRepository.countByIncidentId(i.getId());
        } catch (Exception e) {
            // ignore
        }

        return IncidentResponse.builder()
            .id(i.getId())
            .incidentNumber(i.getIncidentNumber())
            .title(i.getTitle())
            .description(i.getDescription())
            .severity(i.getSeverity())
            .severityLabel(i.getSeverity() != null ? i.getSeverity().getLabel() : null)
            .impact(i.getImpact())
            .impactLabel(i.getImpact() != null ? i.getImpact().getLabel() : null)
            .status(i.getStatus())
            .statusLabel(i.getStatus() != null ? i.getStatus().getLabel() : null)
            .serviceId(i.getService().getId())
            .serviceName(i.getService().getName())
            .ticketId(i.getTicket() != null ? i.getTicket().getId() : null)
            .ticketNumber(i.getTicket() != null ? i.getTicket().getTicketNumber() : null)
            .ticketIds(ticketIds)
            .ticketNumbers(ticketNumbers)
            .affectedServiceIds(serviceIds)
            .affectedServiceNames(serviceNames)
            .commanderId(i.getCommander() != null ? i.getCommander().getId() : null)
            .commanderName(i.getCommander() != null ? i.getCommander().getFullName() : null)
            .postMortem(i.getPostMortem())
            .postMortemAt(i.getPostMortemAt())
            .hasPostMortem(i.hasPostMortem())
            .timelineCount(tlCount)
            .startedAt(i.getStartedAt())
            .resolvedAt(i.getResolvedAt())
            .cause(i.getCause())
            .createdAt(i.getCreatedAt())
            .updatedAt(i.getUpdatedAt())
            .build();
    }

    private IncidentTimelineResponse mapTimelineToResponse(IncidentTimeline tl) {
        return IncidentTimelineResponse.builder()
            .id(tl.getId())
            .eventType(tl.getEventType())
            .eventTypeLabel(tl.getEventType() != null ? tl.getEventType().getLabel() : null)
            .content(tl.getContent())
            .oldValue(tl.getOldValue())
            .newValue(tl.getNewValue())
            .authorId(tl.getAuthor() != null ? tl.getAuthor().getId() : null)
            .authorName(tl.getAuthor() != null ? tl.getAuthor().getFullName() : null)
            .createdAt(tl.getCreatedAt())
            .build();
    }
}
