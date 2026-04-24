package com.billcom.mts.repository;

import com.billcom.mts.entity.TicketAttachment;
import com.billcom.mts.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketAttachmentRepository extends JpaRepository<TicketAttachment, Long> {

    List<TicketAttachment> findByTicketIdOrderByCreatedAtDesc(Long ticketId);

    Optional<TicketAttachment> findByIdAndTicketId(Long id, Long ticketId);

    List<TicketAttachment> findByUploadedById(Long userId);

    long countByTicketId(Long ticketId);

    @Modifying
    @Query("UPDATE TicketAttachment a SET a.uploadedBy = :replacementUser WHERE a.uploadedBy.id = :userId")
    int reassignUploadedBy(@Param("userId") Long userId, @Param("replacementUser") User replacementUser);
}
