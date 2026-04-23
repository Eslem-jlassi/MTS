package com.billcom.mts.service;

// =============================================================================
// IMPORTS
// =============================================================================

// DTOs pour les tickets
import com.billcom.mts.dto.ticket.ApplyMacroRequest;
import com.billcom.mts.dto.ticket.BulkAssignRequest;
import com.billcom.mts.dto.ticket.BulkPriorityRequest;
import com.billcom.mts.dto.ticket.BulkResultDto;
import com.billcom.mts.dto.ticket.BulkStatusRequest;
import com.billcom.mts.dto.ticket.TicketAssignRequest;
import com.billcom.mts.dto.ticket.TicketCommentRequest;
import com.billcom.mts.dto.ticket.TicketCreateRequest;
import com.billcom.mts.dto.ticket.TicketResponse;
import com.billcom.mts.dto.ticket.TicketStatusChangeRequest;

// Entit? User
import com.billcom.mts.entity.User;

// Enums
import com.billcom.mts.enums.SlaStatus;
import com.billcom.mts.enums.TicketCategory;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;

import java.time.LocalDate;

// Spring Data pour la pagination
import com.billcom.mts.dto.ticket.AttachmentDownloadDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

// =============================================================================
// INTERFACE DU SERVICE DE GESTION DES TICKETS
// =============================================================================
/**
 * ============================================================================
 * TicketService - Interface du service de gestion des tickets
 * ============================================================================
 * 
 * QU'EST-CE QU'UNE INTERFACE DE SERVICE?
 * --------------------------------------
 * En Java, une interface d?finit le CONTRAT (les m?thodes disponibles)
 * sans fournir l'impl?mentation.
 * 
 * L'impl?mentation est dans TicketServiceImpl.java.
 * 
 * POURQUOI S?PARER INTERFACE ET IMPL?MENTATION?
 * 1. Abstraction: Le controller conna?t seulement l'interface
 * 2. Testabilit?: On peut cr?er des mocks pour les tests
 * 3. Flexibilit?: On peut changer l'impl?mentation sans modifier le controller
 * 4. Injection: Spring injecte automatiquement l'impl?mentation
 * 
 * EXEMPLE:
 * - Controller injecte: TicketService (interface)
 * - Spring fournit: TicketServiceImpl (impl?mentation)
 * 
 * ARCHITECTURE EN COUCHES:
 * Controller ? Service (interface) ? ServiceImpl ? Repository ? Database
 * 
 * ============================================================================
 */
public interface TicketService {

    // =========================================================================
    // OP?RATIONS CRUD (Create, Read, Update, Delete)
    // =========================================================================

    /**
     * Cr?e un nouveau ticket.
     * 
     * LOGIQUE M?TIER:
     * 1. Valide les donn?es de la requ?te
     * 2. G?n?re un num?ro de ticket unique (TKT-2024-00001)
     * 3. Calcule la deadline SLA selon la priorit?
     * 4. Cr?e l'entr?e dans l'historique
     * 5. Notifie les managers (optionnel)
     * 
     * @param request Donn?es du ticket (titre, description, cat?gorie, etc.)
     * @param currentUser L'utilisateur qui cr?e le ticket (le client)
     * @param ipAddress Adresse IP pour l'audit
     * @return Le ticket cr?? sous forme de DTO
     */
    TicketResponse createTicket(TicketCreateRequest request, User currentUser, String ipAddress);

    /**
     * R?cup?re un ticket par son ID (sans contr?le d'acc?s).
     * 
     * @param ticketId ID num?rique du ticket
     * @return Le ticket sous forme de DTO
     * @throws ResourceNotFoundException si le ticket n'existe pas
     */
    TicketResponse getTicketById(Long ticketId);

    /**
     * R?cup?re un ticket par son ID AVEC contr?le d'acc?s par r?le.
     * 
     * R?GLES D'ACC?S:
     * - CLIENT: Ne voit que SES propres tickets
     * - AGENT: Voit tous les tickets (pour le contexte)
     * - MANAGER/ADMIN: Voit tous les tickets
     * 
     * @param ticketId ID num?rique du ticket
     * @param currentUser Utilisateur connect? (pour v?rifier l'acc?s)
     * @return Le ticket sous forme de DTO
     * @throws ForbiddenException si l'utilisateur n'a pas acc?s
     */
    TicketResponse getTicketByIdSecured(Long ticketId, User currentUser);

    /**
     * R?cup?re un ticket par son num?ro (avec contr?le d'acc?s RBAC).
     *
     * @param ticketNumber Num?ro au format TKT-AAAA-NNNNN
     * @param currentUser Utilisateur connect? (pour v?rifier l'acc?s)
     * @return Le ticket sous forme de DTO
     * @throws ResourceNotFoundException si le ticket n'existe pas
     * @throws ForbiddenException si l'utilisateur n'a pas acc?s
     */
    TicketResponse getTicketByNumberSecured(String ticketNumber, User currentUser);

    /**
     * R?cup?re tous les tickets avec pagination.
     * 
     * FILTRAGE PAR R?LE:
     * - CLIENT: Voit uniquement SES tickets
     * - AGENT: Voit les tickets qui lui sont assign?s
     * - MANAGER/ADMIN: Voit TOUS les tickets
     * 
     * @param currentUser Utilisateur connect? (pour d?terminer la visibilit?)
     * @param pageable Param?tres de pagination (page, size, sort)
     * @return Page de tickets (contient aussi les infos de pagination)
     */
    Page<TicketResponse> getAllTickets(User currentUser, Pageable pageable);

    /**
     * Recherche de tickets avec filtres avanc?s.
     * 
     * Filtres optionnels: clientId, slaStatus (OK / AT_RISK / BREACHED), dateFrom, dateTo.
     * 
     * @param currentUser Pour appliquer les restrictions de r?le
     * @param searchTerm Texte libre (cherche dans titre, description, num?ro)
     * @param status Filtre par statut
     * @param priority Filtre par priorit?
     * @param category Filtre par cat?gorie
     * @param serviceId Filtre par service t?l?com
     * @param assignedToId Filtre par agent assign?
     * @param clientId Filtre par client (MANAGER/ADMIN uniquement)
     * @param slaStatus OK = dans les temps, AT_RISK = &lt; 20% temps restant, BREACHED = d?pass?
     * @param dateFrom Filtre tickets cr??s ? partir de cette date (inclus)
     * @param dateTo Filtre tickets cr??s jusqu'? cette date (inclus)
     * @param pageable Pagination
     * @return Page de tickets correspondant aux crit?res
     */
    Page<TicketResponse> searchTickets(
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
        Pageable pageable
    );

    // =========================================================================
    // OP?RATIONS DE WORKFLOW (Cycle de vie du ticket)
    // =========================================================================

    /**
     * Change le statut d'un ticket.
     * 
     * WORKFLOW:
     * +----------+    +-------------+    +----------+    +--------+
     * ?   OPEN   ?--->? IN_PROGRESS ?--->? RESOLVED ?--->? CLOSED ?
     * +----------+    +-------------+    +----------+    +--------+
     *                       ?
     *                       ?
     *               +---------------+
     *               ?WAITING_CLIENT ? (en attente d'info)
     *               +---------------+
     *                       ?
     *                       ?
     *               +---------------+
     *               ?   ESCALATED   ? (escalad? au manager)
     *               +---------------+
     * 
     * @param ticketId ID du ticket
     * @param request Nouveau statut + commentaire
     * @param currentUser Utilisateur qui fait le changement
     * @param ipAddress IP pour l'audit
     * @return Le ticket mis ? jour
     */
    TicketResponse changeStatus(Long ticketId, TicketStatusChangeRequest request, User currentUser, String ipAddress);

    /**
     * Assigne un ticket ? un agent.
     * 
     * LOGIQUE:
     * 1. V?rifie que l'agent existe et a le r?le AGENT
     * 2. Met ? jour le champ assignedTo du ticket
     * 3. Change le statut ? IN_PROGRESS si OPEN
     * 4. Cr?e une entr?e dans l'historique
     * 5. Notifie l'agent (optionnel)
     * 
     * @param ticketId ID du ticket
     * @param request Contient l'ID de l'agent
     * @param currentUser Le manager/admin qui assigne
     * @param ipAddress IP pour l'audit
     * @return Le ticket mis ? jour
     */
    TicketResponse assignTicket(Long ticketId, TicketAssignRequest request, User currentUser, String ipAddress);

    /**
     * Permet a un agent de prendre un ticket non assigne si le workflow le permet.
     */
    TicketResponse takeTicket(Long ticketId, User currentUser, String ipAddress);

    /**
     * D?sassigne un ticket.
     * 
     * Retire l'agent du ticket. Le ticket revient dans le pool non assign?.
     * 
     * @param ticketId ID du ticket
     * @param currentUser Le manager/admin qui d?sassigne
     * @param ipAddress IP pour l'audit
     * @return Le ticket mis ? jour
     */
    TicketResponse unassignTicket(Long ticketId, User currentUser, String ipAddress);

    /**
     * Supprime un ticket c?t? client avec contr?les de s?curit? et r?gle m?tier.
     *
     * R?GLES:
     * - Seul le client propri?taire peut supprimer son ticket
     * - Le ticket doit ?tre dans un ?tat initial non trait? (NEW)
     * - Le ticket ne doit pas ?tre assign? ? un agent
     *
     * @param ticketId ID du ticket
     * @param currentUser Client connect?
     * @param ipAddress IP pour l'audit
     */
    void deleteTicketAsClient(Long ticketId, User currentUser, String ipAddress);

    /**
     * Supprime d?finitivement un ticket si les d?pendances m?tier rendent
     * l'op?ration s?re.
     */
    void hardDeleteTicketAsAdmin(
        Long ticketId,
        User currentUser,
        String ipAddress,
        com.billcom.mts.dto.security.AdminHardDeleteRequest request);

    /**
     * Emet un challenge de verification (code email) pour les admins OAuth.
     */
    void issueHardDeleteChallenge(Long ticketId, User currentUser, String ipAddress);

    // =========================================================================
    // COMMENTAIRES
    // =========================================================================

    /**
     * Ajoute un commentaire ? un ticket.
     * 
     * TYPES DE COMMENTAIRES:
     * - Public: Visible par le client et le staff
     * - Interne: Visible uniquement par le staff
     * 
     * @param ticketId ID du ticket
     * @param request Contenu du commentaire + visibilit?
     * @param currentUser Auteur du commentaire
     * @param ipAddress IP pour l'audit
     * @return Le ticket mis ? jour avec le nouveau commentaire
     */
    TicketResponse addComment(Long ticketId, TicketCommentRequest request, User currentUser, String ipAddress);

    /**
     * Retourne les commentaires visibles par l'utilisateur connecte.
     * Les notes internes ne sont jamais exposees au client.
     */
    List<TicketResponse.CommentInfo> getComments(Long ticketId, User currentUser);

    /**
     * Retourne l'historique visible par l'utilisateur connecte.
     * Les evenements lies aux notes internes sont filtres cote client.
     */
    List<TicketResponse.HistoryInfo> getHistory(Long ticketId, User currentUser);

    // =========================================================================
    // ENDPOINTS SP?CIFIQUES PAR R?LE
    // =========================================================================

    /**
     * R?cup?re les tickets d'un client sp?cifique.
     * 
     * @param clientId ID du client
     * @param pageable Pagination
     * @return Page des tickets du client
     */
    Page<TicketResponse> getClientTickets(Long clientId, Pageable pageable);

    /**
     * Assignation en masse de tickets ? un agent.
     */
    BulkResultDto bulkAssign(BulkAssignRequest request, User currentUser, String ipAddress);

    /**
     * Changement de statut en masse.
     */
    BulkResultDto bulkStatusChange(BulkStatusRequest request, User currentUser, String ipAddress);

    /**
     * Changement de priorit? en masse.
     */
    BulkResultDto bulkPriorityChange(BulkPriorityRequest request, User currentUser, String ipAddress);

    /**
     * Export CSV des tickets (m?mes filtres que search), encodage UTF-8.
     */
    byte[] exportTicketsCsv(User currentUser, String searchTerm, TicketStatus status,
        TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
        Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo);

    /**
     * Export Excel des tickets (m?mes filtres que search).
     */
    byte[] exportTicketsExcel(User currentUser, String searchTerm, TicketStatus status,
        TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
        Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo);

    /**
     * Export PDF des tickets (m?mes filtres que search).
     */
    byte[] exportTicketsPdf(User currentUser, String searchTerm, TicketStatus status,
        TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
        Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo);

    /**
     * Applique une macro sur un ticket (remplit solution ou ajoute un commentaire).
     */
    TicketResponse applyMacro(Long ticketId, ApplyMacroRequest request, User currentUser, String ipAddress);

    /**
     * R?cup?re les tickets assign?s ? un agent sp?cifique.
     * 
     * @param agentId ID de l'agent
     * @param pageable Pagination
     * @return Page des tickets assign?s ? l'agent
     */
    Page<TicketResponse> getAgentTickets(Long agentId, Pageable pageable);

    /**
     * Retourne le pool de tickets non assignes visible par le role courant.
     */
    Page<TicketResponse> getUnassignedTickets(User currentUser, Pageable pageable);

    // =========================================================================
    // SURVEILLANCE SLA (Service Level Agreement)
    // =========================================================================

    /**
     * R?cup?re les tickets ayant d?pass? leur SLA.
     * 
     * SLA = Temps maximum de r?solution selon la priorit?:
     * - CRITICAL: 4 heures
     * - HIGH: 8 heures
     * - MEDIUM: 24 heures
     * - LOW: 72 heures
     * 
     * Un ticket est en d?passement si:
     * - Il n'est pas CLOSED
     * - breachedSla = true OU deadline < maintenant
     * 
     * @return Liste des tickets en d?passement
     */
    List<TicketResponse> getSlaBreachedTickets();

    /**
     * R?cup?re les tickets approchant leur deadline SLA.
     * 
     * Permet d'anticiper les d?passements et prioriser.
     * 
     * @param hoursBeforeDeadline Nombre d'heures avant la deadline
     * @return Liste des tickets approchant le SLA
     */
    List<TicketResponse> getTicketsApproachingSla(int hoursBeforeDeadline);

    // =========================================================================
    // STATISTIQUES
    // =========================================================================

    /**
     * Compte les tickets par statut.
     * 
     * EXEMPLE DE RETOUR:
     * {
     *   OPEN: 15,
     *   IN_PROGRESS: 8,
     *   RESOLVED: 42,
     *   CLOSED: 100,
     *   WAITING_CLIENT: 3,
     *   ESCALATED: 1
     * }
     * 
     * @return Map statut ? nombre de tickets
     */
    java.util.Map<TicketStatus, Long> getTicketCountByStatus();

    /**
     * Compte les tickets par priorit?.
     * 
     * EXEMPLE DE RETOUR:
     * {
     *   LOW: 50,
     *   MEDIUM: 100,
     *   HIGH: 25,
     *   CRITICAL: 5
     * }
     * 
     * @return Map priorit? ? nombre de tickets
     */
    java.util.Map<TicketPriority, Long> getTicketCountByPriority();

    /**
     * Calcule le temps moyen de r?solution en heures.
     * 
     * Calcul? sur les tickets CLOSED/RESOLVED:
     * Moyenne de (resolvedAt - createdAt)
     * 
     * @return Temps moyen en heures (null si aucun ticket r?solu)
     */
    Double getAverageResolutionTimeHours();

    /**
     * Calcule le taux de conformit? SLA.
     * 
     * FORMULE:
     * (Tickets r?solus dans le SLA / Total tickets r?solus) * 100
     * 
     * EXEMPLE:
     * 85 tickets r?solus dans le SLA / 100 tickets r?solus = 0.85 (85%)
     * 
     * @return Taux entre 0.0 et 1.0 (null si aucun ticket r?solu)
     */
    Double getSlaComplianceRate();

    // =========================================================================
    // PI?CES JOINTES
    // =========================================================================

    /**
     * Ajoute une pi?ce jointe ? un ticket (apr?s contr?le d'acc?s).
     */
    TicketResponse addAttachment(Long ticketId, MultipartFile file, User currentUser);

    /**
     * Retourne la ressource fichier et le nom pour t?l?chargement (apr?s contr?le d'acc?s).
     */
    AttachmentDownloadDto getAttachmentForDownload(Long ticketId, Long attachmentId, User currentUser);
}
// =============================================================================
// FIN DE L'INTERFACE TicketService
// =============================================================================
