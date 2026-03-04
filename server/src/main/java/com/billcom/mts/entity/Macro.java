package com.billcom.mts.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Macro = template / réponse rapide pour les agents.
 * Permet d'appliquer un contenu prédéfini sur un ticket (ex. solution, commentaire).
 * Optionnellement restreint par rôle (AGENT, MANAGER, ADMIN).
 */
@Entity
@Table(name = "macros", indexes = @Index(name = "idx_macros_role", columnList = "role_allowed"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Macro {

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

    /**
     * Rôle autorisé à utiliser cette macro (AGENT, MANAGER, ADMIN). Null = tous les rôles staff.
     */
    @Size(max = 20)
    @Column(name = "role_allowed", length = 20)
    private String roleAllowed;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
