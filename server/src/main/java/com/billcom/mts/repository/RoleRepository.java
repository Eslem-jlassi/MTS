package com.billcom.mts.repository;

import com.billcom.mts.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * RoleRepository - Repository pour l'entité Role.
 * 
 * RÔLE:
 * Accès aux données de la table "roles" via Spring Data JPA.
 * 
 * UTILISATION:
 * - Recherche de rôle par code (ROLE_ADMIN, ROLE_CLIENT, etc.)
 * - Liste de tous les rôles disponibles
 * - Vérification d'existence d'un rôle
 * 
 * MÉTHODES HÉRITÉES DE JpaRepository:
 * - findAll(): Retourne tous les rôles
 * - findById(Long id): Trouve un rôle par son ID
 * - save(Role role): Sauvegarde un rôle
 * - delete(Role role): Supprime un rôle
 * - count(): Compte le nombre de rôles
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    /**
     * Trouve un rôle par son code technique.
     * 
     * @param code Le code du rôle (ex: "ROLE_ADMIN", "ROLE_CLIENT")
     * @return Optional contenant le rôle si trouvé
     * 
     * EXEMPLE:
     * Optional<Role> adminRole = roleRepository.findByCode("ROLE_ADMIN");
     * if (adminRole.isPresent()) {
     *     // Le rôle existe
     * }
     */
    Optional<Role> findByCode(String code);

    /**
     * Vérifie si un rôle existe par son code.
     * 
     * @param code Le code du rôle
     * @return true si le rôle existe, false sinon
     * 
     * PLUS PERFORMANT que findByCode pour une simple vérification d'existence.
     */
    boolean existsByCode(String code);
}
