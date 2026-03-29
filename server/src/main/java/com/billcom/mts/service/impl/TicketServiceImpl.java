package com.billcom.mts.service.impl;

import com.billcom.mts.dto.ticket.*;
import com.billcom.mts.entity.SlaConfig;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.entity.TicketAttachment;
import com.billcom.mts.entity.TicketComment;
import com.billcom.mts.entity.TicketHistory;
import com.billcom.mts.entity.TelecomService;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.SlaStatus;
import com.billcom.mts.enums.*;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ForbiddenException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.*;
import com.billcom.mts.service.TicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.billcom.mts.dto.ticket.AttachmentDownloadDto;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.UUID;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Ticket service implementation with full SLA and audit support.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketServiceImpl implements TicketService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository commentRepository;
    private final TicketHistoryRepository historyRepository;
    private final TicketAttachmentRepository attachmentRepository;
    private final TelecomServiceRepository serviceRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final IncidentRepository incidentRepository;
    private final SlaTimelineRepository slaTimelineRepository;
    private final com.billcom.mts.repository.MacroRepository macroRepository;
    private final com.billcom.mts.repository.SlaConfigRepository slaConfigRepository;

    // Service de notifications temps réel (WebSocket)
    private final com.billcom.mts.service.NotificationService notificationService;

    private final com.billcom.mts.service.AuditService auditService;

    // Service de calcul SLA avancé (horaires ouvrés, pause/reprise)
    private final com.billcom.mts.service.SlaCalculationService slaCalculationService;

    @Value("${mts.sla.critical-hours:1}")
    private int slaCriticalHours;

    @Value("${mts.sla.high-hours:4}")
    private int slaHighHours;

    @Value("${mts.sla.medium-hours:24}")
    private int slaMediumHours;

    @Value("${mts.sla.low-hours:72}")
    private int slaLowHours;

    @Value("${tickets.upload-dir:uploads/tickets}")
    private String ticketUploadDir;

    // === CRUD Operations ===

    @Override
    @Transactional
    public TicketResponse createTicket(TicketCreateRequest request, User currentUser, String ipAddress) {
        log.info("Creating ticket for user: {}", currentUser.getEmail());

        // Get client profile
        Client client = clientRepository.findByUserId(currentUser.getId())
            .orElseThrow(() -> new BadRequestException("User does not have a client profile"));

        // Get telecom service
        TelecomService telecomService = resolveTelecomService(request, currentUser, client);

        // Generate ticket number
        String ticketNumber = generateTicketNumber();

        // SLA: config table (priorité + service) puis défaut par priorité puis props
        int slaHours = resolveSlaHours(request.getPriority(), telecomService.getId());
        LocalDateTime deadline = LocalDateTime.now().plusHours(slaHours);

        // Create ticket (company from client for multi-tenant)
        Ticket ticket = Ticket.builder()
            .ticketNumber(ticketNumber)
            .title(request.getTitle())
            .description(request.getDescription())
            .client(client)
            .company(client.getCompany())
            .service(telecomService)
            .createdBy(currentUser)
            .category(request.getCategory())
            .priority(request.getPriority())
            .status(TicketStatus.NEW)
            .slaHours(slaHours)
            .deadline(deadline)
            .breachedSla(false)
            .build();

        ticket = ticketRepository.save(ticket);

        // Create audit entry
        createHistoryEntry(ticket, currentUser, TicketAction.CREATION, 
            null, TicketStatus.NEW.name(), "Ticket created", ipAddress);
        try {
            auditService.log("Ticket", ticket.getId().toString(), "CREATE", currentUser, "Création " + ticketNumber, ipAddress);
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }

        // *** NOTIFICATION TEMPS RÉEL ***
        // Notifie tous les agents, managers et admins qu'un nouveau ticket a été créé
        try {
            notificationService.notifyTicketCreated(ticket);
        } catch (Exception e) {
            log.warn("Failed to send notification for ticket creation: {}", e.getMessage());
            // On ne fait pas échouer la création du ticket si la notification échoue
        }

        log.info("Ticket created: {}", ticketNumber);
        return mapToResponse(ticket, currentUser);
    }

    private TelecomService resolveTelecomService(TicketCreateRequest request, User currentUser, Client client) {
        if (request.getServiceId() != null && request.getServiceId() > 0) {
            TelecomService telecomService = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", request.getServiceId()));

            if (!telecomService.getIsActive()) {
                throw new BadRequestException("Service is not active");
            }

            return telecomService;
        }

        String requestedServiceName = request.getServiceName() != null ? request.getServiceName().trim() : "";
        if (requestedServiceName.isEmpty()) {
            requestedServiceName = extractServiceNameFromDescription(request.getDescription());
        }
        if (requestedServiceName.isEmpty()) {
            throw new BadRequestException("Service ID or service name is required");
        }

        Optional<TelecomService> existingService = serviceRepository.findFirstByNameIgnoreCase(requestedServiceName);
        if (existingService.isPresent()) {
            TelecomService telecomService = existingService.get();
            if (!telecomService.getIsActive()) {
                throw new BadRequestException("Service is not active");
            }
            return telecomService;
        }

        TelecomService newService = TelecomService.builder()
            .name(requestedServiceName)
            .description("Service auto-cree depuis un brouillon IA de ticket")
            .category(inferServiceCategory(requestedServiceName))
            .isActive(true)
            .createdBy(currentUser)
            .company(client.getCompany())
            .build();

        TelecomService savedService = serviceRepository.save(newService);
        log.info("Created missing telecom service '{}' during ticket creation", requestedServiceName);
        return savedService;
    }

    private String extractServiceNameFromDescription(String description) {
        if (description == null || description.isBlank()) {
            return "";
        }

        for (String line : description.split("\\R")) {
            String trimmedLine = line.trim();
            if (trimmedLine.regionMatches(true, 0, "Service détecté:", 0, "Service détecté:".length())) {
                return trimmedLine.substring("Service détecté:".length()).trim();
            }
            if (trimmedLine.regionMatches(true, 0, "Service detecte:", 0, "Service detecte:".length())) {
                return trimmedLine.substring("Service detecte:".length()).trim();
            }
            if (trimmedLine.regionMatches(true, 0, "Detected service:", 0, "Detected service:".length())) {
                return trimmedLine.substring("Detected service:".length()).trim();
            }
        }

        return "";
    }

    private ServiceCategory inferServiceCategory(String serviceName) {
        String normalizedName = serviceName.toLowerCase(Locale.ROOT);

        if (normalizedName.contains("billing") || normalizedName.contains("bscs")
                || normalizedName.contains("rating") || normalizedName.contains("facturation")) {
            return ServiceCategory.BILLING;
        }

        if (normalizedName.contains("crm") || normalizedName.contains("order care")) {
            return ServiceCategory.CRM;
        }

        if (normalizedName.contains("network") || normalizedName.contains("core")
                || normalizedName.contains("voip") || normalizedName.contains("provisioning")
                || normalizedName.contains("gateway") || normalizedName.contains("portability")) {
            return ServiceCategory.NETWORK;
        }

        if (normalizedName.contains("migration") || normalizedName.contains("cloud")
                || normalizedName.contains("infra") || normalizedName.contains("database")) {
            return ServiceCategory.INFRA;
        }

        return ServiceCategory.OTHER;
    }

    @Override
    @Transactional(readOnly = true)
    public TicketResponse getTicketById(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        return mapToResponse(ticket);
    }

    /**
     * Récupère un ticket par ID avec contrôle d'accès.
     * 
     * RÈGLE D'ACCÈS:
     * - CLIENT: Ne peut voir que SES propres tickets
     * - AGENT: Peut voir les tickets qui lui sont assignés
     * - MANAGER/ADMIN: Peut voir tous les tickets
     * 
     * @param ticketId ID du ticket
     * @param currentUser Utilisateur connecté (pour vérifier l'accès)
     * @return Le ticket sous forme de DTO
     * @throws ForbiddenException si l'utilisateur n'a pas accès
     */
    @Override
    @Transactional(readOnly = true)
    public TicketResponse getTicketByIdSecured(Long ticketId, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));

        // Vérification d'accès selon le rôle
        switch (currentUser.getRole()) {
            case CLIENT -> {
                // CLIENT ne voit que ses propres tickets
                Client client = clientRepository.findByUserId(currentUser.getId()).orElse(null);
                if (client == null || !ticket.getClient().getId().equals(client.getId())) {
                    throw new ForbiddenException("Vous n'avez pas accès à ce ticket");
                }
            }
            case AGENT -> {
                // AGENT voit les tickets qui lui sont assignés + tickets non assignés
                if (ticket.getAssignedTo() != null 
                    && !ticket.getAssignedTo().getId().equals(currentUser.getId())) {
                    // Un agent peut quand même voir les tickets non assignés
                    // pour pouvoir les consulter avant assignation
                }
                // Agents can view all tickets for context, no restriction
            }
            case MANAGER, ADMIN -> {
                // Accès total
            }
        }

        assertCanViewTicket(ticket, currentUser);
        return mapToResponse(ticket, currentUser);
    }

    @Override
    @Transactional(readOnly = true)
    public TicketResponse getTicketByNumberSecured(String ticketNumber, User currentUser) {
        Ticket ticket = ticketRepository.findByTicketNumber(ticketNumber)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "number", ticketNumber));
        // Réutilise la même logique d'accès que getTicketByIdSecured
        switch (currentUser.getRole()) {
            case CLIENT -> {
                Client client = clientRepository.findByUserId(currentUser.getId()).orElse(null);
                if (client == null || !ticket.getClient().getId().equals(client.getId())) {
                    throw new ForbiddenException("Vous n'avez pas accès à ce ticket");
                }
            }
            case AGENT, MANAGER, ADMIN -> { /* accès autorisé */ }
        }
        assertCanViewTicket(ticket, currentUser);
        return mapToResponse(ticket, currentUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TicketResponse> getAllTickets(User currentUser, Pageable pageable) {
        Page<Ticket> tickets;
        
        switch (currentUser.getRole()) {
            case CLIENT -> {
                Client client = clientRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new BadRequestException("User does not have a client profile"));
                tickets = ticketRepository.findByClientId(client.getId(), pageable);
            }
            case AGENT -> tickets = ticketRepository.findAll(
                (root, query, cb) -> cb.or(
                    cb.equal(root.get("assignedTo").get("id"), currentUser.getId()),
                    cb.isNull(root.get("assignedTo"))
                ),
                pageable
            );
            case MANAGER, ADMIN -> tickets = ticketRepository.findAll(pageable);
            default -> throw new ForbiddenException("Unknown role");
        }

        return tickets.map(ticket -> mapToResponse(ticket, currentUser));
    }

    /**
     * ============================================================================
     * RECHERCHE AVANCÉE AVEC JPA SPECIFICATIONS
     * ============================================================================
     * 
     * POURQUOI LES SPECIFICATIONS?
     * ----------------------------
     * La version précédente ne pouvait filtrer que par UN critère à la fois.
     * Avec JPA Specifications, on peut COMBINER dynamiquement plusieurs critères:
     * - status=IN_PROGRESS ET priority=CRITICAL ET search="panne"
     * 
     * COMMENT ÇA MARCHE?
     * -------------------
     * 1. On crée une liste de "Predicate" (conditions SQL)
     * 2. Chaque filtre non-null ajoute un Predicate
     * 3. On combine tous les Predicates avec AND
     * 4. Spring Data exécute la requête résultante
     * 
     * ÉQUIVALENT SQL:
     * SELECT * FROM tickets 
     * WHERE status = 'IN_PROGRESS' 
     *   AND priority = 'CRITICAL' 
     *   AND (title LIKE '%panne%' OR description LIKE '%panne%')
     *   AND client_id = 5  -- si CLIENT
     * ============================================================================
     */
    @Override
    @Transactional(readOnly = true)
    public Page<TicketResponse> searchTickets(
            User currentUser,
            String searchTerm,
            TicketStatus status,
            TicketPriority priority,
            TicketCategory category,
            Long serviceId,
            Long assignedToId,
            Long clientId,
            SlaStatus slaStatus,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable) {
        
        Specification<Ticket> spec = buildSearchSpecification(
            currentUser, searchTerm, status, priority, category, serviceId, assignedToId,
            clientId, slaStatus, dateFrom, dateTo);

        Page<Ticket> tickets = ticketRepository.findAll(spec, pageable);
        return tickets.map(ticket -> mapToResponse(ticket, currentUser));
    }

    /**
     * Construit une Specification JPA qui combine dynamiquement tous les filtres.
     * 
     * Chaque critère non-null est ajouté comme un Predicate AND.
     * Les critères null sont simplement ignorés.
     */
    private Specification<Ticket> buildSearchSpecification(
            User currentUser,
            String searchTerm,
            TicketStatus status,
            TicketPriority priority,
            TicketCategory category,
            Long serviceId,
            Long assignedToId,
            Long clientId,
            SlaStatus slaStatus,
            LocalDate dateFrom,
            LocalDate dateTo) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // ========== FILTRE PAR RÔLE (obligatoire, sécurité) ==========
            switch (currentUser.getRole()) {
                case CLIENT -> {
                    Client client = clientRepository.findByUserId(currentUser.getId()).orElse(null);
                    if (client != null) {
                        predicates.add(cb.equal(root.get("client").get("id"), client.getId()));
                    } else {
                        predicates.add(cb.isNull(root.get("id")));
                    }
                }
                case AGENT -> {
                    predicates.add(cb.or(
                        cb.equal(root.get("assignedTo").get("id"), currentUser.getId()),
                        cb.isNull(root.get("assignedTo"))
                    ));
                }
                case MANAGER, ADMIN -> { }
            }

            // ========== FILTRE PAR CLIENT (MANAGER/ADMIN) ==========
            if (clientId != null) {
                predicates.add(cb.equal(root.get("client").get("id"), clientId));
            }

            // ========== FILTRE PAR STATUT ==========
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // ========== FILTRE PAR PRIORITÉ ==========
            if (priority != null) {
                predicates.add(cb.equal(root.get("priority"), priority));
            }

            // ========== FILTRE PAR CATÉGORIE ==========
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }

            // ========== FILTRE PAR SERVICE ==========
            if (serviceId != null) {
                predicates.add(cb.equal(root.get("service").get("id"), serviceId));
            }

            // ========== FILTRE PAR AGENT ASSIGNÉ ==========
            if (assignedToId != null) {
                predicates.add(cb.equal(root.get("assignedTo").get("id"), assignedToId));
            }

            // ========== FILTRE PAR PLAGE DE DATES (création) ==========
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),
                    dateFrom.atStartOfDay()));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"),
                    dateTo.plusDays(1).atStartOfDay()));
            }

            // ========== FILTRE PAR SLA (OK / à risque / dépassé) ==========
            if (slaStatus != null) {
                List<TicketStatus> terminal = List.of(TicketStatus.CLOSED, TicketStatus.RESOLVED, TicketStatus.CANCELLED);
                Predicate notTerminal = cb.not(root.get("status").in(terminal));
                Predicate deadlinePast = cb.lessThan(root.get("deadline"), cb.currentTimestamp());
                Predicate breachedFlag = cb.isTrue(root.get("breachedSla"));

                switch (slaStatus) {
                    case BREACHED -> {
                        // breachedSla = true OU (actif ET deadline < now)
                        predicates.add(cb.or(breachedFlag,
                            cb.and(notTerminal, deadlinePast)));
                    }
                    case AT_RISK -> {
                        // Actif, deadline > now, et < 20% temps restant (remaining < total/5)
                        jakarta.persistence.criteria.Expression<Long> remainingMin = cb.function(
                            "TIMESTAMPDIFF", Long.class, cb.literal("MINUTE"),
                            cb.currentTimestamp(), root.get("deadline"));
                        jakarta.persistence.criteria.Expression<Long> totalMin = cb.function(
                            "TIMESTAMPDIFF", Long.class, cb.literal("MINUTE"),
                            root.get("createdAt"), root.get("deadline"));
                        predicates.add(notTerminal);
                        predicates.add(cb.greaterThan(remainingMin, 0L));
                        // remaining < total/5  <=>  5*remaining < total (évite quot qui retourne Number)
                        predicates.add(cb.lessThan(cb.prod(remainingMin, cb.literal(5L)), totalMin));
                    }
                    case OK -> {
                        // (actif ET deadline > now ET remaining >= total/5) OU (terminé ET pas breach)
                        jakarta.persistence.criteria.Expression<Long> remainingMin = cb.function(
                            "TIMESTAMPDIFF", Long.class, cb.literal("MINUTE"),
                            cb.currentTimestamp(), root.get("deadline"));
                        jakarta.persistence.criteria.Expression<Long> totalMin = cb.function(
                            "TIMESTAMPDIFF", Long.class, cb.literal("MINUTE"),
                            root.get("createdAt"), root.get("deadline"));
                        // remaining >= total/5  <=>  5*remaining >= total
                        Predicate openOk = cb.and(notTerminal,
                            cb.greaterThan(remainingMin, 0L),
                            cb.greaterThanOrEqualTo(cb.prod(remainingMin, cb.literal(5L)), totalMin));
                        Predicate closedOk = cb.and(root.get("status").in(TicketStatus.CLOSED, TicketStatus.RESOLVED),
                            cb.or(cb.isFalse(root.get("breachedSla")), cb.isNull(root.get("breachedSla"))));
                        predicates.add(cb.or(openOk, closedOk));
                    }
                }
            }

            // ========== RECHERCHE TEXTUELLE ==========
            if (searchTerm != null && !searchTerm.isBlank()) {
                String searchPattern = "%" + searchTerm.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("ticketNumber")), searchPattern),
                    cb.like(cb.lower(root.get("title")), searchPattern),
                    cb.like(cb.lower(root.get("description")), searchPattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // === Workflow Operations ===

    @Override
    @Transactional
    public TicketResponse changeStatus(Long ticketId, TicketStatusChangeRequest request, 
                                         User currentUser, String ipAddress) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertCanWorkOnTicket(ticket, currentUser);

        TicketStatus oldStatus = ticket.getStatus();
        TicketStatus newStatus = request.getNewStatus();

        if (newStatus == TicketStatus.ASSIGNED) {
            throw new BadRequestException(
                "Le statut ASSIGNED doit passer par l'assignation du ticket");
        }

        // Validate transition
        if (!isValidTransition(oldStatus, newStatus)) {
            throw new BadRequestException(String.format(
                "Invalid status transition: %s -> %s", oldStatus, newStatus));
        }

        // Require resolution for RESOLVED status
        if (newStatus == TicketStatus.RESOLVED && 
            (request.getResolution() == null || request.getResolution().isBlank())) {
            throw new BadRequestException("Resolution is required when resolving a ticket");
        }

        if (request.getTimeSpentMinutes() != null && request.getTimeSpentMinutes() < 0) {
            throw new BadRequestException("Le temps passe ne peut pas etre negatif");
        }

        // Update status
        ticket.setStatus(newStatus);

        // === SLA Pause / Reprise automatique ===
        // Si le ticket passe en PENDING → pause du compteur SLA
        if (newStatus == TicketStatus.PENDING && oldStatus != TicketStatus.PENDING) {
            try {
                slaCalculationService.pauseSla(ticket);
                createHistoryEntry(ticket, currentUser, TicketAction.SLA_PAUSED,
                    null, null, "SLA mis en pause pendant l'attente client", ipAddress);
                log.info("SLA paused for ticket {} (status: {} -> {})", ticket.getTicketNumber(), oldStatus, newStatus);
            } catch (Exception e) {
                log.warn("Failed to pause SLA for ticket {}: {}", ticket.getTicketNumber(), e.getMessage());
            }
        }
        // Si le ticket quitte PENDING → reprise du compteur SLA
        if (oldStatus == TicketStatus.PENDING && newStatus.isSlaRunning()) {
            try {
                slaCalculationService.resumeSla(ticket);
                createHistoryEntry(ticket, currentUser, TicketAction.SLA_RESUMED,
                    null, null, "SLA repris apres la sortie de l'attente client", ipAddress);
                log.info("SLA resumed for ticket {} (status: {} -> {})", ticket.getTicketNumber(), oldStatus, newStatus);
            } catch (Exception e) {
                log.warn("Failed to resume SLA for ticket {}: {}", ticket.getTicketNumber(), e.getMessage());
            }
        }

        if (newStatus == TicketStatus.RESOLVED) {
            LocalDateTime resolvedAt = LocalDateTime.now();
            ticket.setResolution(request.getResolution());
            ticket.setResolvedAt(resolvedAt);
            ticket.setClosedAt(null);
            if (ticket.getDeadline() != null && resolvedAt.isAfter(ticket.getDeadline())) {
                ticket.setBreachedSla(true);
            }
            if (request.getRootCause() != null) ticket.setRootCause(request.getRootCause());
            if (request.getFinalCategory() != null) ticket.setFinalCategory(request.getFinalCategory());
            if (request.getTimeSpentMinutes() != null) ticket.setTimeSpentMinutes(request.getTimeSpentMinutes());
            if (request.getImpact() != null) ticket.setImpact(request.getImpact());
        } else if (oldStatus == TicketStatus.RESOLVED && newStatus == TicketStatus.IN_PROGRESS) {
            ticket.setResolvedAt(null);
            ticket.setClosedAt(null);
        } else if (newStatus == TicketStatus.CLOSED) {
            ticket.setClosedAt(LocalDateTime.now());
        }
        // Champs modifiables à tout moment (agent peut les renseigner avant résolution)
        if (request.getRootCause() != null) ticket.setRootCause(request.getRootCause());
        if (request.getFinalCategory() != null) ticket.setFinalCategory(request.getFinalCategory());
        if (request.getTimeSpentMinutes() != null) ticket.setTimeSpentMinutes(request.getTimeSpentMinutes());
        if (request.getImpact() != null) ticket.setImpact(request.getImpact());

        ticket = ticketRepository.save(ticket);

        // Create audit entry
        TicketAction historyAction = oldStatus == TicketStatus.RESOLVED && newStatus == TicketStatus.IN_PROGRESS
            ? TicketAction.REOPEN
            : TicketAction.STATUS_CHANGE;
        createHistoryEntry(ticket, currentUser, historyAction,
            oldStatus.name(), newStatus.name(), request.getComment(), ipAddress);
        try {
            auditService.log("Ticket", ticket.getId().toString(), "STATUS_CHANGE", currentUser,
                oldStatus.name() + " -> " + newStatus.name(), ipAddress);
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }

        // *** NOTIFICATION TEMPS RÉEL ***
        // Notifie le client et l'agent assigné du changement de statut
        try {
            notificationService.notifyTicketStatusChanged(ticket, oldStatus.name(), newStatus.name());
        } catch (Exception e) {
            log.warn("Failed to send status change notification: {}", e.getMessage());
        }

        log.info("Ticket {} status changed: {} -> {}", ticket.getTicketNumber(), oldStatus, newStatus);
        return mapToResponse(ticket, currentUser);
    }

    @Override
    @Transactional
    public TicketResponse assignTicket(Long ticketId, TicketAssignRequest request,
                                         User currentUser, String ipAddress) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertTicketAllowsAssignment(ticket);

        User agent = userRepository.findById(request.getAgentId())
            .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", request.getAgentId()));

        if (agent.getRole() != UserRole.AGENT) {
            throw new BadRequestException("User is not an agent");
        }

        if (Boolean.FALSE.equals(agent.getIsActive())) {
            throw new BadRequestException("Impossible d'assigner un ticket a un agent inactif");
        }

        String oldValue = ticket.getAssignedTo() != null 
            ? ticket.getAssignedTo().getFullName() : null;

        ticket.setAssignedTo(agent);
        // Workflow: NEW → ASSIGNED lors de la première assignation
        if (ticket.getStatus() == TicketStatus.NEW) {
            ticket.setStatus(TicketStatus.ASSIGNED);
            createHistoryEntry(ticket, currentUser, TicketAction.STATUS_CHANGE,
                TicketStatus.NEW.name(), TicketStatus.ASSIGNED.name(), "Assigné à un agent", ipAddress);
        }
        ticket = ticketRepository.save(ticket);

        // Create audit entry
        createHistoryEntry(ticket, currentUser, TicketAction.ASSIGNMENT,
            oldValue, agent.getFullName(), request.getComment(), ipAddress);

        // *** NOTIFICATION TEMPS RÉEL ***
        // Notifie l'agent qu'un ticket lui a été assigné
        try {
            notificationService.notifyTicketAssigned(ticket, agent);
        } catch (Exception e) {
            log.warn("Failed to send assignment notification: {}", e.getMessage());
        }

        log.info("Ticket {} assigned to {}", ticket.getTicketNumber(), agent.getEmail());
        return mapToResponse(ticket, currentUser);
    }

    @Override
    @Transactional
    public TicketResponse unassignTicket(Long ticketId, User currentUser, String ipAddress) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertTicketAllowsAssignment(ticket);

        if (ticket.getAssignedTo() == null) {
            throw new BadRequestException("Aucun agent n'est actuellement assigne a ce ticket");
        }

        String oldValue = ticket.getAssignedTo() != null 
            ? ticket.getAssignedTo().getFullName() : null;

        ticket.setAssignedTo(null);
        if (ticket.getStatus() == TicketStatus.ASSIGNED) {
            ticket.setStatus(TicketStatus.NEW);
        }
        ticket = ticketRepository.save(ticket);

        // Create audit entry
        createHistoryEntry(ticket, currentUser, TicketAction.UNASSIGNMENT,
            oldValue, null, "Ticket unassigned", ipAddress);
        if (ticket.getStatus() == TicketStatus.NEW) {
            createHistoryEntry(ticket, currentUser, TicketAction.STATUS_CHANGE,
                TicketStatus.ASSIGNED.name(), TicketStatus.NEW.name(),
                "Retour au pool non assigne", ipAddress);
        }

        log.info("Ticket {} unassigned", ticket.getTicketNumber());
        return mapToResponse(ticket, currentUser);
    }

    @Override
    @Transactional
    public void deleteTicketAsClient(Long ticketId, User currentUser, String ipAddress) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));

        Client client = clientRepository.findByUserId(currentUser.getId())
            .orElseThrow(() -> new BadRequestException("User does not have a client profile"));

        if (!ticket.getClient().getId().equals(client.getId())) {
            throw new ForbiddenException("Vous ne pouvez supprimer que vos propres tickets");
        }

        if (ticket.getStatus() != TicketStatus.NEW) {
            throw new BadRequestException("Suppression autorisée uniquement pour les tickets nouveaux/non traités");
        }

        if (ticket.getAssignedTo() != null) {
            throw new BadRequestException("Impossible de supprimer un ticket déjà pris en charge");
        }

        TicketStatus oldStatus = ticket.getStatus();
        String ticketNumber = ticket.getTicketNumber();
        ticket.setStatus(TicketStatus.CANCELLED);
        ticket = ticketRepository.save(ticket);

        createHistoryEntry(ticket, currentUser, TicketAction.STATUS_CHANGE,
            oldStatus.name(), TicketStatus.CANCELLED.name(), "Ticket annule par le client", ipAddress);

        try {
            auditService.log("Ticket", ticketId.toString(), "STATUS_CHANGE", currentUser,
                "Annulation " + ticketNumber, ipAddress);
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }

        log.info("Ticket {} cancelled by client {}", ticketNumber, currentUser.getEmail());
    }

    @Override
    @Transactional
    public void hardDeleteTicketAsAdmin(Long ticketId, User currentUser, String ipAddress) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));

        assertTicketCanBeHardDeleted(ticket);

        String ticketNumber = ticket.getTicketNumber();
        String ticketTitle = ticket.getTitle();

        try {
            auditService.log("Ticket", ticketId.toString(), "DELETE", currentUser,
                "Suppression definitive " + ticketNumber, ipAddress);
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }

        cleanupTicketNotifications(ticketId);
        cleanupTicketUploadDirectory(ticketId);
        ticketRepository.delete(ticket);
        log.info("Ticket {} ({}) hard deleted by admin {}", ticketNumber, ticketTitle, currentUser.getEmail());
    }

    // === Comments ===

    /**
     * Ajoute un commentaire à un ticket.
     * 
     * RÈGLE MÉTIER IMPORTANTE:
     * - Les CLIENTs ne peuvent PAS créer de notes internes (isInternal = false forcé)
     * - Seuls les AGENTS, MANAGERS et ADMINS peuvent créer des notes internes
     * - L'action est tracée dans l'historique (COMMENT ou INTERNAL_NOTE)
     */
    @Override
    @Transactional
    public TicketResponse addComment(Long ticketId, TicketCommentRequest request,
                                       User currentUser, String ipAddress) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertCanWorkOnTicket(ticket, currentUser);
        assertTicketAllowsCollaboration(ticket);

        // SÉCURITÉ: Un CLIENT ne peut JAMAIS créer de note interne
        boolean isInternal = request.getIsInternal() != null && request.getIsInternal();
        if (isInternal && currentUser.getRole() == UserRole.CLIENT) {
            log.warn("Client {} attempted to create internal note on ticket {}",
                currentUser.getEmail(), ticket.getTicketNumber());
            isInternal = false; // Force public pour les clients
        }

        TicketComment comment = TicketComment.builder()
            .ticket(ticket)
            .author(currentUser)
            .content(request.getContent())
            .isInternal(isInternal)
            .build();

        commentRepository.save(comment);

        // L'action d'audit distingue commentaire public et note interne
        TicketAction auditAction = isInternal ? TicketAction.INTERNAL_NOTE : TicketAction.COMMENT;
        createHistoryEntry(ticket, currentUser, auditAction,
            null, request.getContent().substring(0, Math.min(50, request.getContent().length())),
            isInternal ? "Note interne ajoutée" : "Commentaire ajouté", ipAddress);

        // *** NOTIFICATION TEMPS RÉEL ***
        // Notifie le client (si commentaire public) ou l'agent assigné
        try {
            notificationService.notifyTicketComment(ticket, currentUser, isInternal);
        } catch (Exception e) {
            log.warn("Failed to send comment notification: {}", e.getMessage());
        }

        log.info("{} added to ticket {} by {}",
            isInternal ? "Internal note" : "Comment",
            ticket.getTicketNumber(), currentUser.getEmail());
        return mapToResponse(ticket, currentUser);
    }

    // ========== Bulk actions ==========

    @Override
    @Transactional
    public BulkResultDto bulkAssign(BulkAssignRequest request, User currentUser, String ipAddress) {
        if (currentUser.getRole() != UserRole.MANAGER && currentUser.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("Seuls MANAGER et ADMIN peuvent assigner en masse");
        }
        User agent = userRepository.findById(request.getAgentId())
            .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", request.getAgentId()));
        if (agent.getRole() != UserRole.AGENT) {
            throw new BadRequestException("L'utilisateur cible n'est pas un agent");
        }
        List<String> errors = new ArrayList<>();
        int success = 0;
        for (Long ticketId : request.getTicketIds()) {
            try {
                TicketAssignRequest assignReq = TicketAssignRequest.builder()
                    .agentId(request.getAgentId())
                    .comment(request.getComment())
                    .build();
                assignTicket(ticketId, assignReq, currentUser, ipAddress);
                success++;
            } catch (Exception e) {
                errors.add("Ticket " + ticketId + ": " + e.getMessage());
            }
        }
        return BulkResultDto.builder()
            .successCount(success)
            .errorCount(errors.size())
            .errors(errors)
            .build();
    }

    @Override
    @Transactional
    public BulkResultDto bulkStatusChange(BulkStatusRequest request, User currentUser, String ipAddress) {
        if (currentUser.getRole() == UserRole.CLIENT) {
            throw new ForbiddenException("Les clients ne peuvent pas changer le statut en masse");
        }
        List<String> errors = new ArrayList<>();
        int success = 0;
        for (Long ticketId : request.getTicketIds()) {
            try {
                TicketStatusChangeRequest statusReq = TicketStatusChangeRequest.builder()
                    .newStatus(request.getNewStatus())
                    .comment(request.getComment())
                    .resolution(request.getNewStatus() == TicketStatus.RESOLVED ? request.getComment() : null)
                    .build();
                changeStatus(ticketId, statusReq, currentUser, ipAddress);
                success++;
            } catch (Exception e) {
                errors.add("Ticket " + ticketId + ": " + e.getMessage());
            }
        }
        return BulkResultDto.builder()
            .successCount(success)
            .errorCount(errors.size())
            .errors(errors)
            .build();
    }

    @Override
    @Transactional
    public BulkResultDto bulkPriorityChange(BulkPriorityRequest request, User currentUser, String ipAddress) {
        if (currentUser.getRole() == UserRole.CLIENT) {
            throw new ForbiddenException("Les clients ne peuvent pas modifier la priorité en masse");
        }
        List<String> errors = new ArrayList<>();
        int success = 0;
        for (Long ticketId : request.getTicketIds()) {
            try {
                Ticket ticket = ticketRepository.findById(ticketId)
                    .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
                checkCanModifyTicket(ticket, currentUser);
                String oldPriority = ticket.getPriority() != null ? ticket.getPriority().name() : null;
                ticket.setPriority(request.getPriority());
                ticketRepository.save(ticket);
                createHistoryEntry(ticket, currentUser, TicketAction.PRIORITY_CHANGE,
                    oldPriority, request.getPriority().name(), "Priorité modifiée en masse", ipAddress);
                success++;
            } catch (Exception e) {
                errors.add("Ticket " + ticketId + ": " + e.getMessage());
            }
        }
        return BulkResultDto.builder()
            .successCount(success)
            .errorCount(errors.size())
            .errors(errors)
            .build();
    }

    private void checkCanModifyTicket(Ticket ticket, User currentUser) {
        if (currentUser.getRole() == UserRole.CLIENT) {
            Client client = clientRepository.findByUserId(currentUser.getId()).orElse(null);
            if (client == null || !ticket.getClient().getId().equals(client.getId())) {
                throw new ForbiddenException("Accès refusé à ce ticket");
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportTicketsCsv(User currentUser, String searchTerm, TicketStatus status,
            TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
            Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo) {
        Specification<Ticket> spec = buildSearchSpecification(
            currentUser, searchTerm, status, priority, category, serviceId, assignedToId,
            clientId, slaStatus, dateFrom, dateTo);
        List<Ticket> tickets = ticketRepository.findAll(spec, Pageable.unpaged()).getContent();
        StringBuilder csv = new StringBuilder();
        csv.append("Numéro;Titre;Statut;Priorité;Catégorie;Client;Service;Assigné à;Créé le;Deadline SLA;SLA dépassé\r\n");
        for (Ticket t : tickets) {
            csv.append(escapeCsv(t.getTicketNumber())).append(';');
            csv.append(escapeCsv(t.getTitle())).append(';');
            csv.append(t.getStatus() != null ? t.getStatus().name() : "").append(';');
            csv.append(t.getPriority() != null ? t.getPriority().name() : "").append(';');
            csv.append(t.getCategory() != null ? t.getCategory().name() : "").append(';');
            csv.append(escapeCsv(t.getClient() != null && t.getClient().getUser() != null ? t.getClient().getUser().getFullName() : "")).append(';');
            csv.append(escapeCsv(t.getService() != null ? t.getService().getName() : "")).append(';');
            csv.append(escapeCsv(t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : "")).append(';');
            csv.append(t.getCreatedAt() != null ? t.getCreatedAt().toString() : "").append(';');
            csv.append(t.getDeadline() != null ? t.getDeadline().toString() : "").append(';');
            csv.append(Boolean.TRUE.equals(t.getBreachedSla()) ? "Oui" : "Non").append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportTicketsExcel(User currentUser, String searchTerm, TicketStatus status,
            TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
            Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo) {
        Specification<Ticket> spec = buildSearchSpecification(
            currentUser, searchTerm, status, priority, category, serviceId, assignedToId,
            clientId, slaStatus, dateFrom, dateTo);
        List<Ticket> tickets = ticketRepository.findAll(spec, Pageable.unpaged()).getContent();
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Tickets");
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Numéro", "Titre", "Statut", "Priorité", "Catégorie", "Client", "Service", "Assigné à", "Créé le", "Deadline SLA", "SLA dépassé"};
            for (int i = 0; i < headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
            }
            int rowNum = 1;
            for (Ticket t : tickets) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(t.getTicketNumber() != null ? t.getTicketNumber() : "");
                row.createCell(1).setCellValue(t.getTitle() != null ? t.getTitle() : "");
                row.createCell(2).setCellValue(t.getStatus() != null ? t.getStatus().name() : "");
                row.createCell(3).setCellValue(t.getPriority() != null ? t.getPriority().name() : "");
                row.createCell(4).setCellValue(t.getCategory() != null ? t.getCategory().name() : "");
                row.createCell(5).setCellValue(t.getClient() != null && t.getClient().getUser() != null ? t.getClient().getUser().getFullName() : "");
                row.createCell(6).setCellValue(t.getService() != null ? t.getService().getName() : "");
                row.createCell(7).setCellValue(t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : "");
                row.createCell(8).setCellValue(t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
                row.createCell(9).setCellValue(t.getDeadline() != null ? t.getDeadline().toString() : "");
                row.createCell(10).setCellValue(Boolean.TRUE.equals(t.getBreachedSla()) ? "Oui" : "Non");
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erreur export Excel", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportTicketsPdf(User currentUser, String searchTerm, TicketStatus status,
            TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
            Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo) {
        Specification<Ticket> spec = buildSearchSpecification(
            currentUser, searchTerm, status, priority, category, serviceId, assignedToId,
            clientId, slaStatus, dateFrom, dateTo);
        List<Ticket> tickets = ticketRepository.findAll(spec, Pageable.unpaged()).getContent();
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);
            PdfWriter.getInstance(document, baos);
            document.open();
            Font font = FontFactory.getFont(FontFactory.HELVETICA, 8);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);
            document.add(new Paragraph("Export tickets - " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME), boldFont));
            document.add(new Paragraph(" "));
            PdfPTable table = new PdfPTable(11);
            table.setWidthPercentage(100);
            table.setSpacingBefore(5);
            for (String h : new String[]{"Numéro", "Titre", "Statut", "Priorité", "Catégorie", "Client", "Service", "Assigné", "Créé", "Deadline", "SLA"}) {
                table.addCell(cell(h, boldFont));
            }
            for (Ticket t : tickets) {
                table.addCell(cell(t.getTicketNumber(), font));
                table.addCell(cell(t.getTitle(), font));
                table.addCell(cell(t.getStatus() != null ? t.getStatus().name() : "", font));
                table.addCell(cell(t.getPriority() != null ? t.getPriority().name() : "", font));
                table.addCell(cell(t.getCategory() != null ? t.getCategory().name() : "", font));
                table.addCell(cell(t.getClient() != null && t.getClient().getUser() != null ? t.getClient().getUser().getFullName() : "", font));
                table.addCell(cell(t.getService() != null ? t.getService().getName() : "", font));
                table.addCell(cell(t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : "", font));
                table.addCell(cell(t.getCreatedAt() != null ? t.getCreatedAt().toString() : "", font));
                table.addCell(cell(t.getDeadline() != null ? t.getDeadline().toString() : "", font));
                table.addCell(cell(Boolean.TRUE.equals(t.getBreachedSla()) ? "Oui" : "Non", font));
            }
            document.add(table);
            document.close();
            return baos.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new RuntimeException("Erreur export PDF", e);
        }
    }

    private static PdfPCell cell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setBorderWidth(0.5f);
        return cell;
    }

    @Override
    @Transactional
    public TicketResponse applyMacro(Long ticketId, ApplyMacroRequest request, User currentUser, String ipAddress) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertCanWorkOnTicket(ticket, currentUser);
        assertTicketAllowsCollaboration(ticket);
        if (currentUser.getRole() == UserRole.CLIENT) {
            Client client = clientRepository.findByUserId(currentUser.getId()).orElse(null);
            if (client == null || !ticket.getClient().getId().equals(client.getId())) {
                throw new ForbiddenException("Vous n'avez pas accès à ce ticket");
            }
        }
        com.billcom.mts.entity.Macro macro = macroRepository.findById(request.getMacroId())
            .orElseThrow(() -> new ResourceNotFoundException("Macro", "id", request.getMacroId()));
        if (macro.getRoleAllowed() != null && !macro.getRoleAllowed().equals(currentUser.getRole().name())) {
            throw new ForbiddenException("Cette macro n'est pas disponible pour votre rôle");
        }
        String target = request.getTargetField() != null ? request.getTargetField().toLowerCase() : "comment";
        if ("solution".equals(target)) {
            ticket.setResolution(macro.getContent());
            ticketRepository.save(ticket);
            createHistoryEntry(ticket, currentUser, TicketAction.UPDATE, null, "Macro appliquée (solution)", "Macro: " + macro.getName(), ipAddress);
        } else {
            boolean isInternal = Boolean.TRUE.equals(request.getIsInternal());
            if (currentUser.getRole() == UserRole.CLIENT) isInternal = false;
            TicketCommentRequest commentReq = TicketCommentRequest.builder()
                .content(macro.getContent())
                .isInternal(isInternal)
                .build();
            addComment(ticketId, commentReq, currentUser, ipAddress);
            ticket = ticketRepository.findById(ticketId).orElse(ticket);
        }
        return mapToResponse(ticket, currentUser);
    }

    // === Client-specific ===

    @Override
    public Page<TicketResponse> getClientTickets(Long clientId, Pageable pageable) {
        return ticketRepository.findByClientId(clientId, pageable).map(this::mapToResponse);
    }

    @Override
    public Page<TicketResponse> getAgentTickets(Long agentId, Pageable pageable) {
        return ticketRepository.findByAssignedToId(agentId, pageable).map(this::mapToResponse);
    }

    @Override
    public Page<TicketResponse> getUnassignedTickets(User currentUser, Pageable pageable) {
        return ticketRepository.findUnassignedActiveTickets(pageable)
            .map(ticket -> mapToResponse(ticket, currentUser));
    }

    // === SLA Monitoring ===

    @Override
    public List<TicketResponse> getSlaBreachedTickets() {
        return ticketRepository.findSlaBreachedTickets().stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<TicketResponse> getTicketsApproachingSla(int hoursBeforeDeadline) {
        LocalDateTime warningTime = LocalDateTime.now().plusHours(hoursBeforeDeadline);
        return ticketRepository.findTicketsApproachingSla(LocalDateTime.now(), warningTime).stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    // === Statistics ===

    @Override
    public Map<TicketStatus, Long> getTicketCountByStatus() {
        List<Object[]> results = ticketRepository.countByStatusGrouped();
        Map<TicketStatus, Long> countMap = new HashMap<>();
        for (Object[] row : results) {
            countMap.put((TicketStatus) row[0], (Long) row[1]);
        }
        return countMap;
    }

    @Override
    public Map<TicketPriority, Long> getTicketCountByPriority() {
        List<Object[]> results = ticketRepository.countByPriorityGrouped();
        Map<TicketPriority, Long> countMap = new HashMap<>();
        for (Object[] row : results) {
            countMap.put((TicketPriority) row[0], (Long) row[1]);
        }
        return countMap;
    }

    @Override
    public Double getAverageResolutionTimeHours() {
        return ticketRepository.getAverageResolutionTimeHours();
    }

    @Override
    public Double getSlaComplianceRate() {
        long total = ticketRepository.countResolvedOrClosedTickets();
        if (total == 0) return 1.0;
        
        long breached = ticketRepository.countSlaBreachedResolvedTickets();
        return 1.0 - ((double) breached / total);
    }

    // ========== Pièces jointes ==========

    @Override
    @Transactional
    public TicketResponse addAttachment(Long ticketId, MultipartFile file, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertCanWorkOnTicket(ticket, currentUser);
        assertTicketAllowsCollaboration(ticket);
        // Contrôle d'accès (même logique que getTicketByIdSecured)
        switch (currentUser.getRole()) {
            case CLIENT -> {
                Client client = clientRepository.findByUserId(currentUser.getId()).orElse(null);
                if (client == null || !ticket.getClient().getId().equals(client.getId())) {
                    throw new ForbiddenException("Vous n'avez pas accès à ce ticket");
                }
            }
            case AGENT, MANAGER, ADMIN -> { /* autorisé */ }
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Fichier requis");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "attachment";
        }
        try {
            Path dir = Paths.get(ticketUploadDir, ticketId.toString());
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }
            String ext = "";
            int dot = originalFilename.lastIndexOf('.');
            if (dot > 0) ext = originalFilename.substring(dot);
            String storedName = UUID.randomUUID().toString() + ext;
            Path targetPath = dir.resolve(storedName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            // Chemin relatif au répertoire ticketUploadDir (ex: 123/abc-uuid.pdf)
            String storedPath = ticketId + "/" + storedName;

            TicketAttachment attachment = TicketAttachment.builder()
                .ticket(ticket)
                .fileName(originalFilename)
                .storedPath(storedPath)
                .uploadedBy(currentUser)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .build();
            attachmentRepository.save(attachment);
            log.info("Attachment {} added to ticket {} by {}", originalFilename, ticket.getTicketNumber(), currentUser.getEmail());
            return mapToResponse(ticket, currentUser);
        } catch (IOException e) {
            log.error("Failed to store attachment for ticket {}", ticketId, e);
            throw new BadRequestException("Erreur lors de l'enregistrement du fichier");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AttachmentDownloadDto getAttachmentForDownload(Long ticketId, Long attachmentId, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertCanViewTicket(ticket, currentUser);
        switch (currentUser.getRole()) {
            case CLIENT -> {
                Client client = clientRepository.findByUserId(currentUser.getId()).orElse(null);
                if (client == null || !ticket.getClient().getId().equals(client.getId())) {
                    throw new ForbiddenException("Vous n'avez pas accès à ce ticket");
                }
            }
            case AGENT, MANAGER, ADMIN -> { /* autorisé */ }
        }
        TicketAttachment attachment = attachmentRepository.findByIdAndTicketId(attachmentId, ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Pièce jointe", "id", attachmentId));
        try {
            Path path = Paths.get(ticketUploadDir).resolve(attachment.getStoredPath());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("Fichier", "path", attachment.getStoredPath());
            }
            return AttachmentDownloadDto.builder()
                .resource(resource)
                .fileName(attachment.getFileName())
                .build();
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Fichier", "id", attachmentId);
        }
    }

    // ========== Private Helper Methods ==========

    private void assertCanViewTicket(Ticket ticket, User currentUser) {
        switch (currentUser.getRole()) {
            case CLIENT -> {
                Client client = clientRepository.findByUserId(currentUser.getId()).orElse(null);
                if (client == null || !ticket.getClient().getId().equals(client.getId())) {
                    throw new ForbiddenException("Vous n'avez pas acces a ce ticket");
                }
            }
            case AGENT -> {
                if (ticket.getAssignedTo() != null
                        && !ticket.getAssignedTo().getId().equals(currentUser.getId())) {
                    throw new ForbiddenException(
                        "Un agent ne peut voir que ses tickets assignes ou non assignes");
                }
            }
            case MANAGER, ADMIN -> {
                // Supervision complete
            }
            default -> throw new ForbiddenException("Role non autorise");
        }
    }

    private void assertCanWorkOnTicket(Ticket ticket, User currentUser) {
        switch (currentUser.getRole()) {
            case CLIENT -> assertCanViewTicket(ticket, currentUser);
            case AGENT -> {
                if (ticket.getAssignedTo() == null
                        || !ticket.getAssignedTo().getId().equals(currentUser.getId())) {
                    throw new ForbiddenException(
                        "Un agent ne peut traiter que les tickets qui lui sont assignes");
                }
            }
            case MANAGER, ADMIN -> {
                // Supervision complete
            }
            default -> throw new ForbiddenException("Role non autorise");
        }
    }

    private String generateTicketNumber() {
        int year = Year.now().getValue();
        String prefix = String.format("TKT-%d-", year);
        
        Integer maxNumber = ticketRepository.findMaxTicketNumber(prefix);
        int nextNumber = (maxNumber != null ? maxNumber : 0) + 1;
        
        return String.format("TKT-%d-%05d", year, nextNumber);
    }

    private int getSlaHours(TicketPriority priority) {
        return switch (priority) {
            case CRITICAL -> slaCriticalHours;
            case HIGH -> slaHighHours;
            case MEDIUM -> slaMediumHours;
            case LOW -> slaLowHours;
        };
    }

    /** Résout les heures SLA: config (priorité+service) > config (priorité) > props/enum. */
    private int resolveSlaHours(TicketPriority priority, Long serviceId) {
        if (slaConfigRepository == null) {
            return getSlaHours(priority);
        }
        return slaConfigRepository.findByPriorityAndService_Id(priority, serviceId)
            .or(() -> slaConfigRepository.findByPriorityAndServiceIsNull(priority))
            .map(SlaConfig::getSlaHours)
            .orElseGet(() -> getSlaHours(priority));
    }

    private boolean isValidTransition(TicketStatus from, TicketStatus to) {
        return from.canTransitionTo(to);
    }

    private void createHistoryEntry(Ticket ticket, User user, TicketAction action,
                                     String oldValue, String newValue, String details, String ipAddress) {
        TicketHistory history = TicketHistory.builder()
            .ticket(ticket)
            .user(user)
            .action(action)
            .oldValue(oldValue)
            .newValue(newValue)
            .details(details)
            .ipAddress(ipAddress)
            .build();
        
        historyRepository.save(history);
    }

    private void assertTicketCanBeHardDeleted(Ticket ticket) {
        if (ticket.getStatus() != TicketStatus.NEW) {
            throw new BadRequestException(
                "Seuls les tickets neufs et jamais traites peuvent etre supprimes definitivement"
            );
        }

        if (ticket.getAssignedTo() != null) {
            throw new BadRequestException(
                "Impossible de supprimer definitivement un ticket deja assigne"
            );
        }

        long commentCount = commentRepository.countByTicketId(ticket.getId());
        if (commentCount > 0) {
            throw new BadRequestException(
                "Impossible de supprimer definitivement un ticket avec commentaires"
            );
        }

        long attachmentCount = attachmentRepository.countByTicketId(ticket.getId());
        if (attachmentCount > 0) {
            throw new BadRequestException(
                "Impossible de supprimer definitivement un ticket avec pieces jointes"
            );
        }

        long historyCount = historyRepository.countByTicketId(ticket.getId());
        if (historyCount > 1) {
            throw new BadRequestException(
                "Impossible de supprimer definitivement un ticket ayant deja un historique metier"
            );
        }

        long slaTimelineCount = slaTimelineRepository.countByTicket_Id(ticket.getId());
        if (slaTimelineCount > 0) {
            throw new BadRequestException(
                "Impossible de supprimer definitivement un ticket ayant deja un historique SLA"
            );
        }

        long directIncidentCount = incidentRepository.countByTicketId(ticket.getId());
        long groupedIncidentCount = incidentRepository.countByTickets_Id(ticket.getId());
        if (directIncidentCount > 0 || groupedIncidentCount > 0) {
            throw new BadRequestException(
                "Impossible de supprimer definitivement un ticket lie a un incident"
            );
        }
    }

    private void cleanupTicketNotifications(Long ticketId) {
        long deletedNotifications = notificationRepository.deleteByReferenceTypeAndReferenceId("TICKET", ticketId);
        if (deletedNotifications > 0) {
            log.info("Deleted {} notification(s) linked to ticket {}", deletedNotifications, ticketId);
        }
    }

    private void cleanupTicketUploadDirectory(Long ticketId) {
        Path uploadDirectory = Paths.get(ticketUploadDir, ticketId.toString()).normalize();
        if (!Files.exists(uploadDirectory)) {
            return;
        }

        try (Stream<Path> paths = Files.walk(uploadDirectory)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException exception) {
                    throw new BadRequestException(
                        "Impossible de supprimer les fichiers joints physiques de ce ticket"
                    );
                }
            });
        } catch (IOException exception) {
            throw new BadRequestException(
                "Impossible de supprimer les fichiers joints physiques de ce ticket"
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse.CommentInfo> getComments(Long ticketId, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertCanViewTicket(ticket, currentUser);
        return buildCommentInfos(ticket, currentUser);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse.HistoryInfo> getHistory(Long ticketId, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        assertCanViewTicket(ticket, currentUser);
        return buildHistoryInfos(ticket, currentUser);
    }

    private void assertTicketAllowsCollaboration(Ticket ticket) {
        if (ticket.getStatus() == TicketStatus.CLOSED || ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new BadRequestException(
                "Aucun commentaire, note interne ou piece jointe n'est autorise sur un ticket clos ou annule"
            );
        }
    }

    private void assertTicketAllowsAssignment(Ticket ticket) {
        if (ticket.getStatus() == TicketStatus.RESOLVED
                || ticket.getStatus() == TicketStatus.CLOSED
                || ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new BadRequestException(
                "Impossible d'assigner ou de desassigner un ticket deja resolu, clos ou annule"
            );
        }
    }

    private boolean canViewInternalNotes(User viewer) {
        return viewer == null || viewer.getRole() != UserRole.CLIENT;
    }

    private List<TicketResponse.CommentInfo> buildCommentInfos(Ticket ticket, User viewer) {
        List<TicketComment> commentEntries = commentRepository != null
            ? commentRepository.findByTicketIdOrderByCreatedAtDesc(ticket.getId())
            : (ticket.getComments() != null ? ticket.getComments() : List.of());

        return commentEntries.stream()
            .filter(comment -> canViewInternalNotes(viewer) || !Boolean.TRUE.equals(comment.getIsInternal()))
            .map(comment -> TicketResponse.CommentInfo.builder()
                .id(comment.getId())
                .authorId(comment.getAuthor().getId())
                .authorName(comment.getAuthor().getFullName())
                .authorRole(comment.getAuthor().getRole().name())
                .content(comment.getContent())
                .isInternal(comment.getIsInternal())
                .createdAt(comment.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    private List<TicketResponse.HistoryInfo> buildHistoryInfos(Ticket ticket, User viewer) {
        List<TicketHistory> historyEntries = historyRepository != null
            ? historyRepository.findByTicketIdOrderByCreatedAtDesc(ticket.getId())
            : List.of();

        return historyEntries.stream()
            .filter(history -> canViewInternalNotes(viewer) || history.getAction() != TicketAction.INTERNAL_NOTE)
            .map(history -> TicketResponse.HistoryInfo.builder()
                .id(history.getId())
                .userId(history.getUser() != null ? history.getUser().getId() : null)
                .userName(history.getUser() != null ? history.getUser().getFullName() : null)
                .action(history.getAction().name())
                .actionLabel(history.getAction().getLabel())
                .oldValue(history.getOldValue())
                .newValue(history.getNewValue())
                .details(history.getDetails())
                .createdAt(history.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    private List<TicketResponse.AttachmentInfo> buildAttachmentInfos(Ticket ticket) {
        List<TicketAttachment> attachmentEntries = attachmentRepository != null
            ? attachmentRepository.findByTicketIdOrderByCreatedAtDesc(ticket.getId())
            : List.of();

        return attachmentEntries.stream()
            .map(att -> TicketResponse.AttachmentInfo.builder()
                .id(att.getId())
                .fileName(att.getFileName())
                .fileSize(att.getFileSize())
                .contentType(att.getContentType())
                .uploadedByName(att.getUploadedBy() != null ? att.getUploadedBy().getFullName() : null)
                .createdAt(att.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    private List<TicketStatus> resolveAllowedTransitions(Ticket ticket, User viewer) {
        if (ticket.getStatus() == null) {
            return List.of();
        }

        if (viewer != null) {
            switch (viewer.getRole()) {
                case CLIENT -> {
                    return List.of();
                }
                case AGENT -> {
                    if (ticket.getAssignedTo() == null
                            || !ticket.getAssignedTo().getId().equals(viewer.getId())) {
                        return List.of();
                    }
                }
                case MANAGER, ADMIN -> {
                    // Acces total de supervision
                }
                default -> {
                    return List.of();
                }
            }
        }

        if (ticket.getStatus() == TicketStatus.NEW) {
            return List.of(TicketStatus.CANCELLED);
        }

        return Arrays.stream(ticket.getStatus().getAllowedTransitions())
            .filter(status -> status != TicketStatus.ASSIGNED)
            .collect(Collectors.toList());
    }

    private TicketResponse mapToResponse(Ticket ticket) {
        return mapToResponse(ticket, null);
    }

    private TicketResponse mapToResponse(Ticket ticket, User viewer) {
        // Calculate SLA metrics
        double slaPercentage = 0.0;
        boolean isSlaBreached = ticket.getBreachedSla() != null && ticket.getBreachedSla();
        boolean slaWarning = false;
        boolean overdue = false;
        long slaRemainingMinutes = 0;
        
        if (ticket.getDeadline() != null && ticket.getSlaHours() != null) {
            long totalMinutes = ticket.getSlaHours() * 60L;
            LocalDateTime referenceTime = ticket.getResolvedAt() != null ? ticket.getResolvedAt() : LocalDateTime.now();
            long elapsedMinutes = ChronoUnit.MINUTES.between(ticket.getCreatedAt(), referenceTime);
            slaPercentage = Math.min(100.0, (elapsedMinutes * 100.0) / totalMinutes);
            
            if (ticket.getResolvedAt() == null) {
                // Ticket still open — calculate remaining time
                slaRemainingMinutes = ChronoUnit.MINUTES.between(LocalDateTime.now(), ticket.getDeadline());
                overdue = slaRemainingMinutes < 0;
                slaWarning = !overdue && slaPercentage >= 75.0; // 75% SLA consumed
            } else {
                // Already resolved — check if it was late
                overdue = ticket.getResolvedAt().isAfter(ticket.getDeadline());
            }
            if (overdue) isSlaBreached = true;
        }

        List<TicketResponse.CommentInfo> commentInfos = buildCommentInfos(ticket, viewer);
        List<TicketResponse.HistoryInfo> historyInfos = buildHistoryInfos(ticket, viewer);
        List<TicketResponse.AttachmentInfo> attachmentInfos = buildAttachmentInfos(ticket);

        return TicketResponse.builder()
            .id(ticket.getId())
            .ticketNumber(ticket.getTicketNumber())
            .title(ticket.getTitle())
            .description(ticket.getDescription())
            .clientId(ticket.getClient().getId())
            .clientName(ticket.getClient().getUser().getFullName())
            .clientCompany(ticket.getClient().getCompanyName())
            .clientCompanyName(ticket.getClient().getCompanyName())
            .serviceId(ticket.getService().getId())
            .serviceName(ticket.getService().getName())
            .category(ticket.getCategory())
            .categoryLabel(ticket.getCategory() != null ? ticket.getCategory().getLabel() : null)
            .priority(ticket.getPriority())
            .status(ticket.getStatus())
            .statusLabel(ticket.getStatus() != null ? ticket.getStatus().getLabel() : null)
            .statusColor(ticket.getStatus() != null ? ticket.getStatus().getColorHex() : null)
            .assignedToId(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null)
            .assignedToName(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getFullName() : null)
            .createdById(ticket.getCreatedBy() != null ? ticket.getCreatedBy().getId() : null)
            .createdByName(ticket.getCreatedBy() != null ? ticket.getCreatedBy().getFullName() : null)
            .resolution(ticket.getResolution())
            .rootCause(ticket.getRootCause())
            .finalCategory(ticket.getFinalCategory())
            .timeSpentMinutes(ticket.getTimeSpentMinutes())
            .impact(ticket.getImpact())
            .slaHours(ticket.getSlaHours())
            .deadline(ticket.getDeadline())
            .slaPercentage(slaPercentage)
            .breachedSla(isSlaBreached)
            .slaWarning(slaWarning)
            .overdue(overdue)
            .slaRemainingMinutes(slaRemainingMinutes)
            .createdAt(ticket.getCreatedAt())
            .updatedAt(ticket.getUpdatedAt())
            .resolvedAt(ticket.getResolvedAt())
            .closedAt(ticket.getClosedAt())
            .comments(commentInfos)
            .history(historyInfos)
            .attachments(attachmentInfos)
            .commentCount(commentInfos.size())
            .allowedTransitions(resolveAllowedTransitions(ticket, viewer))
            .build();
    }

    // ========== Scheduled: SLA Breach Detection ==========

    /**
     * Vérifie toutes les 5 minutes les tickets actifs ayant dépassé le SLA.
     * Persiste breachedSla = true et crée une entrée d'historique.
     */
    /**
     * Job planifié: Détecte les dépassements de SLA toutes les 5 minutes.
     * 
     * LOGIQUE:
     * 1. Récupère tous les tickets dont la deadline est dépassée et non marqués breach
     * 2. Pour chaque ticket: marque breachedSla = true, crée entrée historique
     * 3. Envoie une notification temps réel aux agents, managers et admins
     * 
     * CRITICAL FIX: Added error handling to prevent task from being disabled on exceptions
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void detectSlaBreaches() {
        try {
            log.debug("Starting SLA breach detection job");
            List<Ticket> overdueTickets = ticketRepository.findSlaBreachedTickets();
            int count = 0;
            for (Ticket ticket : overdueTickets) {
            if (ticket.getBreachedSla() == null || !ticket.getBreachedSla()) {
                TicketStatus previousStatus = ticket.getStatus();
                ticket.setBreachedSla(true);
                // Escalade auto: passer en ESCALATED pour visibilité managers
                boolean escalatedAutomatically = false;
                if (ticket.getStatus() != TicketStatus.ESCALATED && ticket.getStatus() != TicketStatus.RESOLVED
                        && ticket.getStatus() != TicketStatus.CLOSED && ticket.getStatus() != TicketStatus.CANCELLED) {
                    ticket.setStatus(TicketStatus.ESCALATED);
                    escalatedAutomatically = true;
                }
                ticketRepository.save(ticket);
                // Use the ticket creator as the history user (system action attributed to creator)
                User historyUser = ticket.getCreatedBy();
                if (historyUser == null && ticket.getAssignedTo() != null) {
                    historyUser = ticket.getAssignedTo();
                }
                if (historyUser != null) {
                    createHistoryEntry(ticket, historyUser, TicketAction.SLA_BREACH,
                        "false", "true", "Délai SLA dépassé automatiquement", "SYSTEM");
                } else {
                    log.warn("Cannot create SLA breach history for ticket {} - no user found", ticket.getTicketNumber());
                    createHistoryEntry(ticket, null, TicketAction.SLA_BREACH,
                        "false", "true", "SLA breach detected automatically", "SYSTEM");
                }
                
                // *** NOTIFICATION TEMPS RÉEL - SLA BREACH ***
                try {
                    notificationService.notifySlaBreach(ticket);
                } catch (Exception e) {
                    log.warn("Failed to send SLA breach notification for {}: {}", 
                        ticket.getTicketNumber(), e.getMessage());
                }
                
                if (escalatedAutomatically) {
                    createHistoryEntry(ticket, historyUser, TicketAction.ESCALATION,
                        previousStatus.name(), TicketStatus.ESCALATED.name(),
                        "Escalade automatique suite au depassement du SLA", "SYSTEM");
                    try {
                        notificationService.notifyTicketStatusChanged(
                            ticket, previousStatus.name(), TicketStatus.ESCALATED.name());
                    } catch (Exception e) {
                        log.warn("Failed to send automatic escalation notification for {}: {}",
                            ticket.getTicketNumber(), e.getMessage());
                    }
                }

                count++;
            }
        }
        if (count > 0) {
            log.warn("SLA breach detected for {} ticket(s)", count);
        } else {
            log.debug("No SLA breaches detected");
        }
        } catch (Exception e) {
            log.error("Failed to detect SLA breaches - scheduled job will continue", e);
            // Don't rethrow - allow the scheduled job to continue running
        }
    }

    /**
     * Job: Détecte les tickets "à risque" (>= 80% du SLA consommé) et envoie une notification.
     * On ne notifie qu'une fois par ticket (slaWarningNotifiedAt) pour éviter le spam.
     * 
     * CRITICAL FIX: Added error handling to prevent task from being disabled on exceptions
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void detectSlaAtRisk() {
        try {
            log.debug("Starting SLA at-risk detection job");
            LocalDateTime now = LocalDateTime.now();
            List<Ticket> active = ticketRepository.findActiveTickets();
            int count = 0;
            for (Ticket ticket : active) {
                if (ticket.getSlaWarningNotifiedAt() != null) continue;
                if (ticket.getBreachedSla() != null && ticket.getBreachedSla()) continue;
                if (ticket.getDeadline() == null || now.isAfter(ticket.getDeadline())) continue;
                double pct = ticket.getSlaPercentageUsed();
                if (pct < 80.0) continue;
                try {
                    notificationService.notifySlaWarning(ticket, (int) pct);
                    ticket.setSlaWarningNotifiedAt(now);
                    ticketRepository.save(ticket);
                    count++;
                } catch (Exception e) {
                    log.warn("Failed to send SLA warning for ticket {}: {}", ticket.getTicketNumber(), e.getMessage());
                }
            }
            if (count > 0) {
                log.info("SLA at-risk notification sent for {} ticket(s)", count);
            } else {
                log.debug("No tickets at risk detected");
            }
        } catch (Exception e) {
            log.error("Failed to detect SLA at-risk tickets - scheduled job will continue", e);
            // Don't rethrow - allow the scheduled job to continue running
        }
    }
}
