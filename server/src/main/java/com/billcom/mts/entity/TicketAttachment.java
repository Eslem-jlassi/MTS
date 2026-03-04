package com.billcom.mts.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Pièce jointe associée à un ticket (upload fichier).
 * Contrôle d'accès: même règles que le ticket (client = ses tickets, agent/manager/admin = selon rôle).
 */
@Entity
@Table(name = "ticket_attachments", indexes = {
    @Index(name = "idx_attachment_ticket_id", columnList = "ticket_id"),
    @Index(name = "idx_attachment_created_at", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    /** Nom original du fichier (côté client). */
    @NotBlank
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    /** Chemin de stockage sur le serveur (relatif au répertoire uploads). */
    @NotBlank
    @Column(name = "stored_path", nullable = false, length = 512)
    private String storedPath;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
