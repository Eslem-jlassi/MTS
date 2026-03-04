package com.billcom.mts.entity;

import com.billcom.mts.enums.TicketAction;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * TicketHistory entity - Immutable audit trail for all ticket changes.
 *
 * Records: Who, When, What, Old Value -> New Value, IP Address
 */
@Entity
@Table(name = "ticket_history", indexes = {
        @Index(name = "idx_history_ticket_id", columnList = "ticket_id"),
        @Index(name = "idx_history_user_id", columnList = "user_id"),
        @Index(name = "idx_history_action", columnList = "action"),
        @Index(name = "idx_history_created_at", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "action", nullable = false, length = 30)
    private TicketAction action;

    @Size(max = 255)
    @Column(name = "old_value", length = 255)
    private String oldValue;

    @Size(max = 255)
    @Column(name = "new_value", length = 255)
    private String newValue;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Size(max = 45)
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    // ========== Builder Helpers ==========

    public static TicketHistoryBuilder creation(Ticket ticket, User user, String ipAddress) {
        return TicketHistory.builder()
                .ticket(ticket)
                .user(user)
                .action(TicketAction.CREATION)
                .newValue(ticket.getStatus().name())
                .details("Ticket created")
                .ipAddress(ipAddress);
    }

    public static TicketHistoryBuilder statusChange(Ticket ticket, User user, String oldStatus, String newStatus, String ipAddress) {
        return TicketHistory.builder()
                .ticket(ticket)
                .user(user)
                .action(TicketAction.STATUS_CHANGE)
                .oldValue(oldStatus)
                .newValue(newStatus)
                .details("Status changed")
                .ipAddress(ipAddress);
    }

    public static TicketHistoryBuilder assignment(Ticket ticket, User user, String oldAgent, String newAgent, String ipAddress) {
        return TicketHistory.builder()
                .ticket(ticket)
                .user(user)
                .action(TicketAction.ASSIGNMENT)
                .oldValue(oldAgent)
                .newValue(newAgent)
                .details("Assignment changed")
                .ipAddress(ipAddress);
    }

    public static TicketHistoryBuilder comment(Ticket ticket, User user, boolean isInternal, String ipAddress) {
        return TicketHistory.builder()
                .ticket(ticket)
                .user(user)
                .action(isInternal ? TicketAction.INTERNAL_NOTE : TicketAction.COMMENT)
                .details(isInternal ? "Internal note added" : "Comment added")
                .ipAddress(ipAddress);
    }
}
