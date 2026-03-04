package com.billcom.mts.repository;

// =============================================================================
// IMPORTS
// =============================================================================

import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// =============================================================================
// REPOSITORY DES UTILISATEURS
// =============================================================================
/**
 * ============================================================================
 * UserRepository - Interface d'accès aux données utilisateurs
 * ============================================================================
 * 
 * QU'EST-CE QU'UN REPOSITORY?
 * ---------------------------
 * Un Repository est une interface qui définit les opérations d'accès à la base.
 * Spring Data JPA génère automatiquement l'implémentation!
 * 
 * On écrit seulement l'interface, Spring fait le reste:
 * - findByEmail(String email) → SELECT * FROM users WHERE email = ?
 * - existsByEmail(String email) → SELECT COUNT(*) > 0 FROM users WHERE email = ?
 * 
 * COMMENT ÇA MARCHE?
 * ------------------
 * Spring analyse le nom de la méthode pour créer la requête:
 * - findBy + Email = WHERE email = ?
 * - findBy + Role + And + IsActive = WHERE role = ? AND is_active = ?
 * - countBy + Role = SELECT COUNT(*) WHERE role = ?
 * 
 * INTERFACES ÉTENDUES:
 * - JpaRepository<User, Long>: Opérations CRUD basiques
 *   - save(), findById(), findAll(), deleteById(), etc.
 *   - User: Type de l'entité
 *   - Long: Type de la clé primaire
 * 
 * ANNOTATIONS:
 * @Repository: Indique que c'est un composant d'accès aux données
 *              Spring le détecte et gère les exceptions
 * 
 * ============================================================================
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // =========================================================================
    // MÉTHODES DE RECHERCHE PAR EMAIL
    // =========================================================================

    /**
     * Trouve un utilisateur par son email.
     * 
     * ÉQUIVALENT SQL:
     * SELECT * FROM users WHERE email = ?
     * 
     * Optional<User>: Peut retourner un User ou être vide (email non trouvé)
     * Évite les NullPointerException!
     * 
     * @param email L'email à rechercher
     * @return Optional contenant l'utilisateur ou vide
     */
    Optional<User> findByEmail(String email);

    /**
     * Trouve un utilisateur par fournisseur OAuth et son identifiant provider.
     *
     * ÉQUIVALENT SQL:
     * SELECT * FROM users WHERE oauth_provider = ? AND oauth_provider_id = ?
     *
     * @param oauthProvider   Le fournisseur (ex: "GOOGLE")
     * @param oauthProviderId L'identifiant unique chez le fournisseur (sub)
     * @return Optional contenant l'utilisateur ou vide
     */
    Optional<User> findByOauthProviderAndOauthProviderId(String oauthProvider, String oauthProviderId);

    /**
     * Vérifie si un email existe déjà.
     * 
     * ÉQUIVALENT SQL:
     * SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)
     * 
     * Utile pour la validation lors de l'inscription.
     * 
     * @param email L'email à vérifier
     * @return true si l'email existe, false sinon
     */
    boolean existsByEmail(String email);

    // =========================================================================
    // MÉTHODES DE RECHERCHE PAR RÔLE
    // =========================================================================

    /**
     * Trouve tous les utilisateurs ayant un rôle spécifique.
     * 
     * ÉQUIVALENT SQL:
     * SELECT * FROM users WHERE role = ?
     * 
     * @param role Le rôle à rechercher (ADMIN, MANAGER, AGENT, CLIENT)
     * @return Liste des utilisateurs avec ce rôle
     */
    List<User> findByRole(UserRole role);

    /**
     * Trouve les utilisateurs actifs avec un rôle spécifique.
     * 
     * ÉQUIVALENT SQL:
     * SELECT * FROM users WHERE role = ? AND is_active = true
     * 
     * Utile pour les listes déroulantes (ex: liste des agents actifs).
     * 
     * @param role Le rôle à rechercher
     * @return Liste des utilisateurs actifs avec ce rôle
     */
    List<User> findByRoleAndIsActiveTrue(UserRole role);

    /**
     * Trouve les utilisateurs par rôle avec pagination.
     * 
     * Pageable: Objet contenant page (n° de page), size (éléments par page), sort
     * Page<User>: Résultat paginé avec métadonnées (totalPages, totalElements, etc.)
     * 
     * @param role Le rôle à rechercher
     * @param pageable Paramètres de pagination
     * @return Page d'utilisateurs
     */
    Page<User> findByRole(UserRole role, Pageable pageable);

    /**
     * Trouve les utilisateurs par statut actif avec pagination.
     */
    Page<User> findByIsActive(Boolean isActive, Pageable pageable);

    /**
     * Trouve les utilisateurs par rôle ET statut actif avec pagination.
     * 
     * Combiner plusieurs conditions: findBy + Field1 + And + Field2
     */
    Page<User> findByRoleAndIsActive(UserRole role, Boolean isActive, Pageable pageable);

    // =========================================================================
    // REQUÊTES JPQL PERSONNALISÉES
    // =========================================================================
    
    /**
     * Trouve les utilisateurs actifs par rôle, triés par nom.
     * 
     * @Query: Permet d'écrire une requête JPQL personnalisée
     * 
     * JPQL (Java Persistence Query Language):
     * - Similaire à SQL mais utilise les classes Java au lieu des tables
     * - "u" est un alias pour l'entité User
     * - ":role" est un paramètre nommé (lié par @Param)
     * 
     * ÉQUIVALENT SQL:
     * SELECT * FROM users u 
     * WHERE u.role = ? AND u.is_active = true 
     * ORDER BY u.last_name, u.first_name
     * 
     * @param role Le rôle à rechercher
     * @return Liste triée des utilisateurs actifs
     */
    @Query("SELECT u FROM User u WHERE u.role = :role AND u.isActive = true ORDER BY u.lastName, u.firstName")
    List<User> findActiveByRole(@Param("role") UserRole role);

    /**
     * Compte le nombre d'utilisateurs par rôle.
     * 
     * ÉQUIVALENT SQL:
     * SELECT COUNT(*) FROM users WHERE role = ?
     * 
     * @param role Le rôle à compter
     * @return Nombre d'utilisateurs avec ce rôle
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") UserRole role);

    /**
     * Recherche d'utilisateurs par terme (prénom, nom ou email).
     * 
     * RECHERCHE INSENSIBLE À LA CASSE:
     * - LOWER() convertit en minuscules
     * - CONCAT('%', :search, '%') ajoute les wildcards pour le LIKE
     * 
     * ÉQUIVALENT SQL:
     * SELECT * FROM users u WHERE 
     *   LOWER(u.first_name) LIKE LOWER('%search%') OR
     *   LOWER(u.last_name) LIKE LOWER('%search%') OR
     *   LOWER(u.email) LIKE LOWER('%search%')
     * 
     * @param search Terme de recherche
     * @param pageable Pagination
     * @return Page d'utilisateurs correspondants
     */
    @Query("SELECT u FROM User u WHERE " +
           "(LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);

    // =========================================================================
    // MÉTHODES POUR NOTIFICATIONS
    // =========================================================================

    /**
     * Trouve les utilisateurs ayant un rôle parmi une liste.
     * 
     * Utilisé pour envoyer des notifications à plusieurs types d'utilisateurs.
     * Ex: findByRoleIn([AGENT, MANAGER]) → tous les agents et managers
     * 
     * ÉQUIVALENT SQL:
     * SELECT * FROM users WHERE role IN ('AGENT', 'MANAGER')
     * 
     * @param roles Liste des rôles à rechercher
     * @return Liste des utilisateurs avec ces rôles
     */
    List<User> findByRoleIn(List<UserRole> roles);

    /**
     * Trouve les utilisateurs actifs ayant un rôle parmi une liste.
     * 
     * @param roles Liste des rôles à rechercher
     * @return Liste des utilisateurs actifs avec ces rôles
     */
    List<User> findByRoleInAndIsActiveTrue(List<UserRole> roles);

    // =========================================================================
    // AUTH FLOWS — Password Reset / Email Verification
    // =========================================================================

    /** Find user by password reset token */
    Optional<User> findByPasswordResetToken(String token);

    /** Find user by email verification token */
    Optional<User> findByEmailVerificationToken(String token);
}
// =============================================================================
// FIN DU REPOSITORY UTILISATEURS
// =============================================================================
