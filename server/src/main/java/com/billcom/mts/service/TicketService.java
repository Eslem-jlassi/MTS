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

// Entité User
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
 * En Java, une interface définit le CONTRAT (les méthodes disponibles)
 * sans fournir l'implémentation.
 * 
 * L'implémentation est dans TicketServiceImpl.java.
 * 
 * POURQUOI SÉPARER INTERFACE ET IMPLÉMENTATION?
 * 1. Abstraction: Le controller connaît seulement l'interface
 * 2. Testabilité: On peut créer des mocks pour les tests
 * 3. Flexibilité: On peut changer l'implémentation sans modifier le controller
 * 4. Injection: Spring injecte automatiquement l'implémentation
 * 
 * EXEMPLE:
 * - Controller injecte: TicketService (interface)
 * - Spring fournit: TicketServiceImpl (implémentation)
 * 
 * ARCHITECTURE EN COUCHES:
 * Controller → Service (interface) → ServiceImpl → Repository → Database
 * 
 * ============================================================================
 */
public interface TicketService {

    // =========================================================================
    // OPÉRATIONS CRUD (Create, Read, Update, Delete)
    // =========================================================================

    /**
     * Crée un nouveau ticket.
     * 
     * LOGIQUE MÉTIER:
     * 1. Valide les données de la requête
     * 2. Génère un numéro de ticket unique (TKT-2024-00001)
     * 3. Calcule la deadline SLA selon la priorité
     * 4. Crée l'entrée dans l'historique
     * 5. Notifie les managers (optionnel)
     * 
     * @param request Données du ticket (titre, description, catégorie, etc.)
     * @param currentUser L'utilisateur qui crée le ticket (le client)
     * @param ipAddress Adresse IP pour l'audit
     * @return Le ticket créé sous forme de DTO
     */
    TicketResponse createTicket(TicketCreateRequest request, User currentUser, String ipAddress);

    /**
     * Récupère un ticket par son ID (sans contrôle d'accès).
     * 
     * @param ticketId ID numérique du ticket
     * @return Le ticket sous forme de DTO
     * @throws ResourceNotFoundException si le ticket n'existe pas
     */
    TicketResponse getTicketById(Long ticketId);

    /**
     * Récupère un ticket par son ID AVEC contrôle d'accès par rôle.
     * 
     * RÈGLES D'ACCÈS:
     * - CLIENT: Ne voit que SES propres tickets
     * - AGENT: Voit tous les tickets (pour le contexte)
     * - MANAGER/ADMIN: Voit tous les tickets
     * 
     * @param ticketId ID numérique du ticket
     * @param currentUser Utilisateur connecté (pour vérifier l'accès)
     * @return Le ticket sous forme de DTO
     * @throws ForbiddenException si l'utilisateur n'a pas accès
     */
    TicketResponse getTicketByIdSecured(Long ticketId, User currentUser);

    /**
     * Récupère un ticket par son numéro (avec contrôle d'accès RBAC).
     *
     * @param ticketNumber Numéro au format TKT-AAAA-NNNNN
     * @param currentUser Utilisateur connecté (pour vérifier l'accès)
     * @return Le ticket sous forme de DTO
     * @throws ResourceNotFoundException si le ticket n'existe pas
     * @throws ForbiddenException si l'utilisateur n'a pas accès
     */
    TicketResponse getTicketByNumberSecured(String ticketNumber, User currentUser);

    /**
     * Récupère tous les tickets avec pagination.
     * 
     * FILTRAGE PAR RÔLE:
     * - CLIENT: Voit uniquement SES tickets
     * - AGENT: Voit les tickets qui lui sont assignés
     * - MANAGER/ADMIN: Voit TOUS les tickets
     * 
     * @param currentUser Utilisateur connecté (pour déterminer la visibilité)
     * @param pageable Paramètres de pagination (page, size, sort)
     * @return Page de tickets (contient aussi les infos de pagination)
     */
    Page<TicketResponse> getAllTickets(User currentUser, Pageable pageable);

    /**
     * Recherche de tickets avec filtres avancés.
     * 
     * Filtres optionnels: clientId, slaStatus (OK / AT_RISK / BREACHED), dateFrom, dateTo.
     * 
     * @param currentUser Pour appliquer les restrictions de rôle
     * @param searchTerm Texte libre (cherche dans titre, description, numéro)
     * @param status Filtre par statut
     * @param priority Filtre par priorité
     * @param category Filtre par catégorie
     * @param serviceId Filtre par service télécom
     * @param assignedToId Filtre par agent assigné
     * @param clientId Filtre par client (MANAGER/ADMIN uniquement)
     * @param slaStatus OK = dans les temps, AT_RISK = &lt; 20% temps restant, BREACHED = dépassé
     * @param dateFrom Filtre tickets créés à partir de cette date (inclus)
     * @param dateTo Filtre tickets créés jusqu'à cette date (inclus)
     * @param pageable Pagination
     * @return Page de tickets correspondant aux critères
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
    // OPÉRATIONS DE WORKFLOW (Cycle de vie du ticket)
    // =========================================================================

    /**
     * Change le statut d'un ticket.
     * 
     * WORKFLOW:
     * ┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌────────┐
     * │   OPEN   │───>│ IN_PROGRESS │───>│ RESOLVED │───>│ CLOSED │
     * └──────────┘    └─────────────┘    └──────────┘    └────────┘
     *                       │
     *                       ▼
     *               ┌───────────────┐
     *               │WAITING_CLIENT │ (en attente d'info)
     *               └───────────────┘
     *                       │
     *                       ▼
     *               ┌───────────────┐
     *               │   ESCALATED   │ (escaladé au manager)
     *               └───────────────┘
     * 
     * @param ticketId ID du ticket
     * @param request Nouveau statut + commentaire
     * @param currentUser Utilisateur qui fait le changement
     * @param ipAddress IP pour l'audit
     * @return Le ticket mis à jour
     */
    TicketResponse changeStatus(Long ticketId, TicketStatusChangeRequest request, User currentUser, String ipAddress);

    /**
     * Assigne un ticket à un agent.
     * 
     * LOGIQUE:
     * 1. Vérifie que l'agent existe et a le rôle AGENT
     * 2. Met à jour le champ assignedTo du ticket
     * 3. Change le statut à IN_PROGRESS si OPEN
     * 4. Crée une entrée dans l'historique
     * 5. Notifie l'agent (optionnel)
     * 
     * @param ticketId ID du ticket
     * @param request Contient l'ID de l'agent
     * @param currentUser Le manager/admin qui assigne
     * @param ipAddress IP pour l'audit
     * @return Le ticket mis à jour
     */
    TicketResponse assignTicket(Long ticketId, TicketAssignRequest request, User currentUser, String ipAddress);

    /**
     * Désassigne un ticket.
     * 
     * Retire l'agent du ticket. Le ticket revient dans le pool non assigné.
     * 
     * @param ticketId ID du ticket
     * @param currentUser Le manager/admin qui désassigne
     * @param ipAddress IP pour l'audit
     * @return Le ticket mis à jour
     */
    TicketResponse unassignTicket(Long ticketId, User currentUser, String ipAddress);

    /**
     * Supprime un ticket côté client avec contrôles de sécurité et règle métier.
     *
     * RÈGLES:
     * - Seul le client propriétaire peut supprimer son ticket
     * - Le ticket doit être dans un état initial non traité (NEW)
     * - Le ticket ne doit pas être assigné à un agent
     *
     * @param ticketId ID du ticket
     * @param currentUser Client connecté
     * @param ipAddress IP pour l'audit
     */
    void deleteTicketAsClient(Long ticketId, User currentUser, String ipAddress);

    /**
     * Supprime dÃ©finitivement un ticket si les dÃ©pendances mÃ©tier rendent
     * l'opÃ©ration sÃ»re.
     */
    void hardDeleteTicketAsAdmin(Long ticketId, User currentUser, String ipAddress);

    // =========================================================================
    // COMMENTAIRES
    // =========================================================================

    /**
     * Ajoute un commentaire à un ticket.
     * 
     * TYPES DE COMMENTAIRES:
     * - Public: Visible par le client et le staff
     * - Interne: Visible uniquement par le staff
     * 
     * @param ticketId ID du ticket
     * @param request Contenu du commentaire + visibilité
     * @param currentUser Auteur du commentaire
     * @param ipAddress IP pour l'audit
     * @return Le ticket mis à jour avec le nouveau commentaire
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
    // ENDPOINTS SPÉCIFIQUES PAR RÔLE
    // =========================================================================

    /**
     * Récupère les tickets d'un client spécifique.
     * 
     * @param clientId ID du client
     * @param pageable Pagination
     * @return Page des tickets du client
     */
    Page<TicketResponse> getClientTickets(Long clientId, Pageable pageable);

    /**
     * Assignation en masse de tickets à un agent.
     */
    BulkResultDto bulkAssign(BulkAssignRequest request, User currentUser, String ipAddress);

    /**
     * Changement de statut en masse.
     */
    BulkResultDto bulkStatusChange(BulkStatusRequest request, User currentUser, String ipAddress);

    /**
     * Changement de priorité en masse.
     */
    BulkResultDto bulkPriorityChange(BulkPriorityRequest request, User currentUser, String ipAddress);

    /**
     * Export CSV des tickets (mêmes filtres que search), encodage UTF-8.
     */
    byte[] exportTicketsCsv(User currentUser, String searchTerm, TicketStatus status,
        TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
        Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo);

    /**
     * Export Excel des tickets (mêmes filtres que search).
     */
    byte[] exportTicketsExcel(User currentUser, String searchTerm, TicketStatus status,
        TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
        Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo);

    /**
     * Export PDF des tickets (mêmes filtres que search).
     */
    byte[] exportTicketsPdf(User currentUser, String searchTerm, TicketStatus status,
        TicketPriority priority, TicketCategory category, Long serviceId, Long assignedToId,
        Long clientId, SlaStatus slaStatus, LocalDate dateFrom, LocalDate dateTo);

    /**
     * Applique une macro sur un ticket (remplit solution ou ajoute un commentaire).
     */
    TicketResponse applyMacro(Long ticketId, ApplyMacroRequest request, User currentUser, String ipAddress);

    /**
     * Récupère les tickets assignés à un agent spécifique.
     * 
     * @param agentId ID de l'agent
     * @param pageable Pagination
     * @return Page des tickets assignés à l'agent
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
     * Récupère les tickets ayant dépassé leur SLA.
     * 
     * SLA = Temps maximum de résolution selon la priorité:
     * - CRITICAL: 4 heures
     * - HIGH: 8 heures
     * - MEDIUM: 24 heures
     * - LOW: 72 heures
     * 
     * Un ticket est en dépassement si:
     * - Il n'est pas CLOSED
     * - breachedSla = true OU deadline < maintenant
     * 
     * @return Liste des tickets en dépassement
     */
    List<TicketResponse> getSlaBreachedTickets();

    /**
     * Récupère les tickets approchant leur deadline SLA.
     * 
     * Permet d'anticiper les dépassements et prioriser.
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
     * @return Map statut → nombre de tickets
     */
    java.util.Map<TicketStatus, Long> getTicketCountByStatus();

    /**
     * Compte les tickets par priorité.
     * 
     * EXEMPLE DE RETOUR:
     * {
     *   LOW: 50,
     *   MEDIUM: 100,
     *   HIGH: 25,
     *   CRITICAL: 5
     * }
     * 
     * @return Map priorité → nombre de tickets
     */
    java.util.Map<TicketPriority, Long> getTicketCountByPriority();

    /**
     * Calcule le temps moyen de résolution en heures.
     * 
     * Calculé sur les tickets CLOSED/RESOLVED:
     * Moyenne de (resolvedAt - createdAt)
     * 
     * @return Temps moyen en heures (null si aucun ticket résolu)
     */
    Double getAverageResolutionTimeHours();

    /**
     * Calcule le taux de conformité SLA.
     * 
     * FORMULE:
     * (Tickets résolus dans le SLA / Total tickets résolus) * 100
     * 
     * EXEMPLE:
     * 85 tickets résolus dans le SLA / 100 tickets résolus = 0.85 (85%)
     * 
     * @return Taux entre 0.0 et 1.0 (null si aucun ticket résolu)
     */
    Double getSlaComplianceRate();

    // =========================================================================
    // PIÈCES JOINTES
    // =========================================================================

    /**
     * Ajoute une pièce jointe à un ticket (après contrôle d'accès).
     */
    TicketResponse addAttachment(Long ticketId, MultipartFile file, User currentUser);

    /**
     * Retourne la ressource fichier et le nom pour téléchargement (après contrôle d'accès).
     */
    AttachmentDownloadDto getAttachmentForDownload(Long ticketId, Long attachmentId, User currentUser);
}
// =============================================================================
// FIN DE L'INTERFACE TicketService
// =============================================================================
