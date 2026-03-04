package com.billcom.mts.entity;

// =============================================================================
// IMPORTS - Bibliothèques nécessaires
// =============================================================================
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

// =============================================================================
// ENTITÉ ROLE - Table des rôles RBAC
// =============================================================================
/**
 * Role - Entité représentant un rôle dans le système RBAC.
 * 
 * RÔLE DE CETTE CLASSE:
 * Cette entité stocke les rôles disponibles dans l'application.
 * Elle permet une gestion flexible des permissions via une table dédiée.
 * 
 * RBAC (Role-Based Access Control):
 * Au lieu de stocker le rôle directement dans la table users (approche ENUM),
 * on utilise une table séparée "roles" avec une table de liaison "user_roles".
 * 
 * AVANTAGES:
 * - Ajout de nouveaux rôles sans modifier le code
 * - Possibilité d'attribuer plusieurs rôles à un utilisateur
 * - Audit: on sait qui a assigné quel rôle et quand
 * - Conformité aux bonnes pratiques de sécurité
 * 
 * RÔLES PRÉDÉFINIS:
 * - ROLE_ADMIN: Administrateur système - accès total
 * - ROLE_MANAGER: Manager - statistiques, rapports, supervision
 * - ROLE_AGENT: Agent support - traitement tickets
 * - ROLE_CLIENT: Client - création et suivi tickets
 * 
 * TABLE SQL:
 * CREATE TABLE roles (
 *     id BIGINT PRIMARY KEY AUTO_INCREMENT,
 *     code VARCHAR(30) UNIQUE NOT NULL,
 *     name VARCHAR(50) NOT NULL,
 *     description VARCHAR(255),
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
@Entity
@Table(name = "roles", indexes = {
    @Index(name = "idx_role_code", columnList = "code")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    // =========================================================================
    // CLÉ PRIMAIRE
    // =========================================================================
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // CHAMPS PRINCIPAUX
    // =========================================================================
    
    /**
     * Code technique du rôle (ex: ROLE_ADMIN, ROLE_CLIENT).
     * 
     * Convention Spring Security: préfixe "ROLE_"
     * Ce code est utilisé dans les annotations @PreAuthorize
     */
    @NotBlank
    @Size(max = 30)
    @Column(nullable = false, unique = true, length = 30)
    private String code;

    /**
     * Nom lisible du rôle (ex: "Administrateur", "Agent Support").
     * 
     * Utilisé pour l'affichage dans l'interface utilisateur.
     */
    @NotBlank
    @Size(max = 50)
    @Column(nullable = false, length = 50)
    private String name;

    /**
     * Description détaillée du rôle et de ses permissions.
     */
    @Size(max = 255)
    @Column(length = 255)
    private String description;

    // =========================================================================
    // TIMESTAMPS
    // =========================================================================
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // =========================================================================
    // MÉTHODES UTILITAIRES
    // =========================================================================
    
    /**
     * Retourne le code sans le préfixe "ROLE_".
     * Ex: ROLE_ADMIN -> ADMIN
     */
    public String getSimpleCode() {
        if (code != null && code.startsWith("ROLE_")) {
            return code.substring(5);
        }
        return code;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Role role = (Role) o;
        return code != null && code.equals(role.code);
    }

    @Override
    public int hashCode() {
        return code != null ? code.hashCode() : 0;
    }
}
