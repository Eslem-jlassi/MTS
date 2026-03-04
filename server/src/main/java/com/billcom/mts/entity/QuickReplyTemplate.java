package com.billcom.mts.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * QuickReplyTemplate — Templates de réponse rapide pour les agents/managers.
 * Stockés en base, gérés via CRUD.
 */
@Entity
@Table(name = "quick_reply_templates", indexes = {
    @Index(name = "idx_qrt_category", columnList = "category"),
    @Index(name = "idx_qrt_role", columnList = "role_allowed")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickReplyTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    /** Catégorie : accuse, info, resolution, cloture, escalade, custom */
    @Size(max = 30)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String category = "custom";

    /** Comma-separated variable placeholders, e.g. "{client},{ticketId}" */
    @Size(max = 500)
    @Column(length = 500)
    private String variables;

    /** Rôle autorisé (AGENT, MANAGER, ADMIN). NULL = tous les rôles staff. */
    @Size(max = 20)
    @Column(name = "role_allowed", length = 20)
    private String roleAllowed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
