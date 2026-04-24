package com.billcom.mts.repository;

import com.billcom.mts.entity.TicketHistory;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.TicketAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for TicketHistory entity operations.
 * Note: History entries are NEVER deleted (immutable audit trail).
 */
@Repository
public interface TicketHistoryRepository extends JpaRepository<TicketHistory, Long> {

    List<TicketHistory> findByTicketIdOrderByCreatedAtDesc(Long ticketId);

    Page<TicketHistory> findByTicketId(Long ticketId, Pageable pageable);

    List<TicketHistory> findByTicketIdAndAction(Long ticketId, TicketAction action);

    List<TicketHistory> findByUserId(Long userId);

    List<TicketHistory> findByUserIdAndCreatedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    long countByTicketId(Long ticketId);

    long countByUserId(Long userId);

    long countByAction(TicketAction action);

    @Modifying
    @Query("UPDATE TicketHistory h SET h.user = :replacementUser WHERE h.user.id = :userId")
    int reassignUser(@Param("userId") Long userId, @Param("replacementUser") User replacementUser);

    @Modifying
    @Query("DELETE FROM TicketHistory h WHERE h.ticket.id = :ticketId")
    int deleteByTicketId(@Param("ticketId") Long ticketId);
}
