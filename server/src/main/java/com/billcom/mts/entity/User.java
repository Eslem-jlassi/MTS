package com.billcom.mts.entity;

// =============================================================================
// IMPORTS - Toutes les bibliothèques nécessaires pour l'entité User
// =============================================================================

import com.billcom.mts.enums.UserRole;         // Enum des rôles (CLIENT, AGENT, MANAGER, ADMIN)

// Jakarta Persistence (JPA) - Pour le mapping objet-relationnel (ORM)
import jakarta.persistence.*;                   // Annotations JPA (@Entity, @Table, @Column, etc.)

// Jakarta Validation - Pour valider les données
import jakarta.validation.constraints.Email;    // Valide le format email
import jakarta.validation.constraints.NotBlank; // Champ obligatoire et non vide
import jakarta.validation.constraints.Size;     // Limite la taille

// Lombok - Génération automatique de code
import lombok.*;                                // @Getter, @Setter, @Builder, etc.

// Hibernate - Extensions pour les timestamps automatiques
import org.hibernate.annotations.CreationTimestamp;  // Date de création auto
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;    // Date de modification auto
import org.hibernate.type.SqlTypes;

// Spring Security - Interface UserDetails pour l'authentification
import org.springframework.security.core.GrantedAuthority;       // Interface pour les permissions
import org.springframework.security.core.authority.SimpleGrantedAuthority; // Implémentation simple
import org.springframework.security.core.userdetails.UserDetails;          // Interface utilisateur

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

// =============================================================================
// ENTITÉ USER - Table principale des utilisateurs
// =============================================================================
/**
 * ============================================================================
 * User - Entité représentant un utilisateur du système
 * ============================================================================
 * 
 * RÔLE DE CETTE CLASSE:
 * Cette entité représente la table "users" en base de données.
 * Elle stocke tous les utilisateurs, quel que soit leur rôle:
 * - CLIENT: Les clients qui créent des tickets
 * - AGENT: Les agents de support qui traitent les tickets
 * - MANAGER: Les superviseurs qui gèrent l'équipe
 * - ADMIN: Les administrateurs système
 * 
 * PARTICULARITÉ: Implémente UserDetails
 * Cette classe implémente l'interface UserDetails de Spring Security.
 * Cela permet à Spring Security de l'utiliser directement pour l'authentification.
 * 
 * ANNOTATIONS LOMBOK:
 * - @Getter: Génère tous les getters (getId(), getEmail(), etc.)
 * - @Setter: Génère tous les setters (setId(), setEmail(), etc.)
 * - @Builder: Permet de construire l'objet avec le pattern Builder
 * - @NoArgsConstructor: Génère un constructeur sans paramètres
 * - @AllArgsConstructor: Génère un constructeur avec tous les paramètres
 * 
 * CORRESPONDANCE TABLE SQL:
 * CREATE TABLE users (
 *     id BIGINT PRIMARY KEY AUTO_INCREMENT,
 *     email VARCHAR(100) UNIQUE NOT NULL,
 *     password VARCHAR(255) NOT NULL,
 *     first_name VARCHAR(50),
 *     last_name VARCHAR(50),
 *     role VARCHAR(20) NOT NULL,
 *     phone VARCHAR(20),
 *     profile_photo_url VARCHAR(255),
 *     is_active BOOLEAN DEFAULT TRUE,
 *     last_login_at TIMESTAMP,
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     updated_at TIMESTAMP
 * );
 * 
 * ============================================================================
 */
@Entity                                         // Marque cette classe comme entité JPA
@Table(name = "users", indexes = {              // Définit le nom de la table et les index
    @Index(name = "idx_email", columnList = "email"),       // Index sur email (recherches fréquentes)
    @Index(name = "idx_role", columnList = "role"),         // Index sur role (filtrage par rôle)
    @Index(name = "idx_is_active", columnList = "isActive") // Index sur isActive (filtrage)
})
@Getter                 // Lombok: génère getId(), getEmail(), getFirstName(), etc.
@Setter                 // Lombok: génère setId(), setEmail(), setFirstName(), etc.
@Builder                // Lombok: User.builder().email("...").password("...").build()
@NoArgsConstructor      // Lombok: public User() {} - requis par JPA
@AllArgsConstructor     // Lombok: public User(Long id, String email, ...) {}
public class User implements UserDetails {      // Implémente UserDetails pour Spring Security

    // =========================================================================
    // CLÉ PRIMAIRE
    // =========================================================================
    
    /**
     * Identifiant unique de l'utilisateur (clé primaire).
     * 
     * @Id: Marque ce champ comme clé primaire
     * @GeneratedValue: La valeur est générée automatiquement
     * IDENTITY: Utilise AUTO_INCREMENT de MySQL
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // CHAMPS D'AUTHENTIFICATION
    // =========================================================================
    
    /**
     * Email de l'utilisateur (sert d'identifiant de connexion).
     * 
     * @Email: Valide que c'est un format email valide
     * @NotBlank: Obligatoire et non vide (pas null, pas "", pas "   ")
     * @Size(max = 100): Maximum 100 caractères
     * @Column(unique = true): Pas de doublons en BDD
     */
    @Email
    @NotBlank
    @Size(max = 100)
    @Column(unique = true, nullable = false, length = 100)
    private String email;

    /**
     * Mot de passe HASHÉ (jamais en clair!).
     * 
     * Le mot de passe est encodé avec BCrypt avant stockage.
     * Longueur 255 car BCrypt génère des hashes longs.
     */
    @NotBlank
    @Size(max = 255)
    @Column(nullable = false)
    private String password;

    // =========================================================================
    // INFORMATIONS PERSONNELLES
    // =========================================================================
    
    /**
     * Prénom de l'utilisateur.
     * 
     * @Column(name = "first_name"): Nom de la colonne en BDD (snake_case)
     * Le champ Java est en camelCase, la colonne SQL en snake_case
     */
    @Size(max = 50)
    @Column(name = "first_name", length = 50)
    private String firstName;

    /**
     * Nom de famille de l'utilisateur.
     */
    @Size(max = 50)
    @Column(name = "last_name", length = 50)
    private String lastName;

    /**
     * Rôle de l'utilisateur dans le système.
     * 
     * @Enumerated(EnumType.STRING): Stocke "ADMIN" au lieu de 0
     * EnumType.ORDINAL stockerait l'index (0, 1, 2...) - DÉCONSEILLÉ!
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /**
     * Numéro de téléphone (optionnel).
     */
    @Size(max = 20)
    @Column(length = 20)
    private String phone;

    /**
     * URL de la photo de profil (optionnel).
     */
    @Size(max = 255)
    @Column(name = "profile_photo_url")
    private String profilePhotoUrl;

    // =========================================================================
    // OAUTH PROVIDER TRACKING
    // =========================================================================

    /**
     * Fournisseur OAuth utilisé pour l'inscription (GOOGLE, etc.).
     * NULL si le compte a été créé via email/mot de passe.
     */
    @Size(max = 20)
    @Column(name = "oauth_provider", length = 20)
    private String oauthProvider;

    /**
     * Identifiant unique chez le fournisseur OAuth (Google "sub" claim).
     * Permet un lookup fiable même si l'utilisateur change d'email.
     */
    @Size(max = 255)
    @Column(name = "oauth_provider_id")
    private String oauthProviderId;

    // =========================================================================
    // PASSWORD RESET + EMAIL VERIFICATION
    // =========================================================================

    /** Token unique pour la réinitialisation du mot de passe. */
    @Column(name = "password_reset_token")
    private String passwordResetToken;

    /** Date d'expiration du token de reset. */
    @Column(name = "password_reset_token_expiry")
    private LocalDateTime passwordResetTokenExpiry;

    /** Indique si l'email de l'utilisateur est vérifié. */
    @Builder.Default
    @Column(name = "email_verified")
    private Boolean emailVerified = true;

    /** Token de vérification d'email. */
    @Column(name = "email_verification_token")
    private String emailVerificationToken;

    /** Date d'expiration du token de verification d'email. */
    @Column(name = "email_verification_token_expiry")
    private LocalDateTime emailVerificationTokenExpiry;

    // =========================================================================
    // NOTIFICATION PREFERENCES (JSON)
    // =========================================================================

    /** Préférences de notification stockées en JSON. */
    @Column(name = "notification_preferences", columnDefinition = "JSON")
    private String notificationPreferences;

    // =========================================================================
    // ÉTAT DU COMPTE
    // =========================================================================
    
    /**
     * Indique si le compte est actif.
     * 
     * @Builder.Default: Valeur par défaut quand on utilise le Builder
     * Sans ça, un new User() aurait isActive = null
     * 
     * Un admin peut désactiver un compte sans le supprimer.
     * L'utilisateur ne pourra plus se connecter.
     */
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /**
     * Date de dernière connexion.
     * 
     * Mise à jour à chaque login réussi.
     * Utile pour détecter les comptes inactifs.
     */
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    // =========================================================================
    // TIMESTAMPS AUTOMATIQUES
    // =========================================================================
    
    /**
     * Date de création du compte.
     * 
     * @CreationTimestamp: Hibernate définit automatiquement la valeur à l'INSERT
     * updatable = false: Ne pas modifier lors des UPDATE
     */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Date de dernière modification.
     * 
     * @UpdateTimestamp: Hibernate met à jour automatiquement à chaque UPDATE
     */
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // =========================================================================
    // RELATIONS AVEC D'AUTRES ENTITÉS
    // =========================================================================
    
    /**
     * Profil client associé (si l'utilisateur est un CLIENT).
     * 
     * RELATION: User (1) ←→ (0..1) Client
     * Un User peut avoir 0 ou 1 profil Client (seulement si role = CLIENT)
     * 
     * mappedBy = "user": Le champ "user" dans Client possède la relation
     * cascade = ALL: Si on supprime le User, on supprime aussi le Client
     * fetch = LAZY: Ne charge pas le Client automatiquement (performance)
     */
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Client clientProfile;

    // =========================================================================
    // IMPLÉMENTATION DE UserDetails (Spring Security)
    // =========================================================================
    
    /**
     * Retourne les autorités (permissions/rôles) de l'utilisateur.
     * 
     * Spring Security utilise le préfixe "ROLE_" par convention.
     * Donc pour un admin: "ROLE_ADMIN"
     * 
     * hasRole("ADMIN") vérifie en fait "ROLE_ADMIN"
     * 
     * @return Collection contenant UN rôle (ex: ROLE_CLIENT)
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // SimpleGrantedAuthority est l'implémentation simple de GrantedAuthority
        // On crée une liste avec un seul élément: le rôle de l'utilisateur
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    /**
     * Retourne l'identifiant de connexion (email dans notre cas).
     * 
     * Spring Security appelle cette méthode pour identifier l'utilisateur.
     * Par convention, ça s'appelle "username" mais on utilise l'email.
     */
    @Override
    public String getUsername() {
        return email;
    }

    /**
     * Indique si le compte n'est pas expiré.
     * 
     * On pourrait implémenter une logique d'expiration de compte ici.
     * Pour l'instant, on retourne toujours true (pas d'expiration).
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * Indique si le compte n'est pas verrouillé.
     * 
     * Retourne true si le compte est actif.
     * Un compte désactivé (isActive = false) est considéré comme "locked".
     */
    @Override
    public boolean isAccountNonLocked() {
        return isActive;
    }

    /**
     * Indique si les credentials (mot de passe) ne sont pas expirés.
     * 
     * On pourrait forcer le changement de mot de passe après X jours.
     * Pour l'instant, on retourne toujours true.
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * Indique si le compte est activé.
     * 
     * Même logique que isAccountNonLocked.
     */
    @Override
    public boolean isEnabled() {
        return isActive;
    }

    // =========================================================================
    // MÉTHODES UTILITAIRES
    // =========================================================================
    
    /**
     * Retourne le nom complet de l'utilisateur.
     * 
     * Concatène prénom + nom.
     * Si les deux sont null, retourne l'email.
     */
    public String getFullName() {
        if (firstName == null && lastName == null) {
            return email;
        }
        return String.format("%s %s", 
            firstName != null ? firstName : "", 
            lastName != null ? lastName : "").trim();
    }

    /**
     * Vérifie si l'utilisateur est un CLIENT.
     */
    public boolean isClient() {
        return role == UserRole.CLIENT;
    }

    /**
     * Vérifie si l'utilisateur est un AGENT.
     */
    public boolean isAgent() {
        return role == UserRole.AGENT;
    }

    /**
     * Vérifie si l'utilisateur est un MANAGER.
     */
    public boolean isManager() {
        return role == UserRole.MANAGER;
    }

    /**
     * Vérifie si l'utilisateur est un ADMIN.
     */
    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }
}
