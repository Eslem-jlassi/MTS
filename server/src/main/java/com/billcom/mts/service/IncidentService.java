package com.billcom.mts.service;

import com.billcom.mts.dto.incident.*;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.IncidentStatus;
import com.billcom.mts.enums.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/** Service de gestion des incidents de supervision (liés aux services). */
public interface IncidentService {

    IncidentResponse create(IncidentRequest request, User currentUser);

    IncidentResponse update(Long id, IncidentRequest request, User currentUser);

    IncidentResponse getById(Long id, User currentUser);

    Page<IncidentResponse> findAll(Pageable pageable, User currentUser);

    Page<IncidentResponse> findByServiceId(Long serviceId, Pageable pageable, User currentUser);

    List<IncidentResponse> findActive(User currentUser);

    long countActive();

    /** Filtre combiné. */
    Page<IncidentResponse> findFiltered(IncidentStatus status, Severity severity, Long serviceId,
                                         Pageable pageable, User currentUser);

    /** Changer le statut d'un incident (avec timeline). */
    IncidentResponse changeStatus(Long id, IncidentStatus newStatus, User currentUser);

    /** Clôturer un incident. */
    IncidentResponse close(Long id, User currentUser);

    /** Ajouter une note à la timeline. */
    IncidentTimelineResponse addNote(Long id, IncidentNoteRequest request, User currentUser);

    /** Enregistrer ou mettre à jour le post-mortem. */
    IncidentResponse savePostMortem(Long id, PostMortemRequest request, User currentUser);

    /** Lier des tickets à un incident. */
    IncidentResponse linkTickets(Long id, List<Long> ticketIds, User currentUser);

    /** Délier un ticket. */
    IncidentResponse unlinkTicket(Long id, Long ticketId, User currentUser);

    /** Lier des services affectés à un incident. */
    IncidentResponse linkServices(Long id, List<Long> serviceIds, User currentUser);

    /** Délier un service affecté. */
    IncidentResponse unlinkService(Long id, Long serviceId, User currentUser);

    /** Timeline complète d'un incident. */
    List<IncidentTimelineResponse> getTimeline(Long id, User currentUser);

    /** Incidents affectant un service (via many-to-many). */
    List<IncidentResponse> findByAffectedService(Long serviceId, User currentUser);
}
