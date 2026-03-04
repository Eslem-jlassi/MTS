package com.billcom.mts.repository;

import com.billcom.mts.entity.TicketComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for TicketComment entity operations.
 */
@Repository
public interface TicketCommentRepository extends JpaRepository<TicketComment, Long> {

    List<TicketComment> findByTicketIdOrderByCreatedAtDesc(Long ticketId);

    Page<TicketComment> findByTicketId(Long ticketId, Pageable pageable);

    /**
     * Public comments only (visible to clients).
     */
    @Query("SELECT c FROM TicketComment c WHERE c.ticket.id = :ticketId AND c.isInternal = false ORDER BY c.createdAt DESC")
    List<TicketComment> findPublicCommentsByTicketId(@Param("ticketId") Long ticketId);

    /**
     * All comments including internal notes (for agents/managers).
     */
    @Query("SELECT c FROM TicketComment c WHERE c.ticket.id = :ticketId ORDER BY c.createdAt DESC")
    List<TicketComment> findAllCommentsByTicketId(@Param("ticketId") Long ticketId);

    long countByTicketId(Long ticketId);

    long countByAuthorId(Long authorId);
}
