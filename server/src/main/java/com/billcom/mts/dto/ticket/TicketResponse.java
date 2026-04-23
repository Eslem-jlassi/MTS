package com.billcom.mts.dto.ticket;

import com.billcom.mts.enums.TicketCategory;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ticket response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {

    private Long id;
    private String ticketNumber;
    private String title;
    private String description;

    // ========== Classification ==========
    
    private TicketCategory category;
    private String categoryLabel;
    private TicketPriority priority;
    private TicketStatus status;
    private String statusLabel;
    private String statusColor;

    // ========== Relations (simplified) ==========
    
    private Long clientId;
    private String clientName;
    private String clientCompany;
    /** Alias pour compatibilité frontend (même valeur que clientCompany) */
    private String clientCompanyName;
    
    private Long serviceId;
    private String serviceName;
    
    private Long assignedToId;
    private String assignedToName;
    
    private Long createdById;
    private String createdByName;

    // ========== Resolution ==========
    
    private String resolution;
    /** Cause racine (analyse post-résolution) */
    private String rootCause;
    /** Catégorie finale après analyse */
    private TicketCategory finalCategory;
    /** Temps passé en minutes */
    private Integer timeSpentMinutes;
    /** Impact métier */
    private String impact;

    // ========== SLA ==========
    
    private Integer slaHours;
    private LocalDateTime deadline;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
    private Boolean breachedSla;
    private Double slaPercentage;
    private Boolean slaWarning;
    private Boolean overdue;
    private Long slaRemainingMinutes;

    // ========== Timestamps ==========
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ========== Collections ==========
    
    private List<CommentInfo> comments;
    private List<HistoryInfo> history;
    private List<AttachmentInfo> attachments;
    private Integer commentCount;

    // ========== Transitions ==========
    
    private List<TicketStatus> allowedTransitions;
    private Boolean canTakeOwnership;

    // ========== Nested Classes ==========

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentInfo {
        private Long id;
        private Long authorId;
        private String authorName;
        /** Rôle de l'auteur (CLIENT, AGENT, MANAGER, ADMIN) - utile pour l'affichage frontend */
        private String authorRole;
        private String content;
        private Boolean isInternal;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryInfo {
        private Long id;
        private Long userId;
        private String userName;
        private String action;
        private String actionLabel;
        private String oldValue;
        private String newValue;
        private String details;
        private LocalDateTime createdAt;
    }

    /** Résumé d'une pièce jointe (liste dans le détail ticket). */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttachmentInfo {
        private Long id;
        private String fileName;
        private Long fileSize;
        private String contentType;
        private String uploadedByName;
        private LocalDateTime createdAt;
    }
}
