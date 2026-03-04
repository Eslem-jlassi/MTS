package com.billcom.mts.security;

// =============================================================================
// IMPORTS
// =============================================================================

import com.billcom.mts.repository.UserRepository;  // Repository pour accéder aux users en BDD
import lombok.RequiredArgsConstructor;              // Génère le constructeur
import org.springframework.security.core.userdetails.UserDetails;        // Interface Spring Security
import org.springframework.security.core.userdetails.UserDetailsService; // Interface à implémenter
import org.springframework.security.core.userdetails.UsernameNotFoundException; // Exception
import org.springframework.stereotype.Service;

// =============================================================================
// SERVICE DE CHARGEMENT DES UTILISATEURS
// =============================================================================
/**
 * ============================================================================
 * MtsUserDetailsService - Service de chargement des utilisateurs
 * ============================================================================
 * 
 * RÔLE DE CETTE CLASSE:
 * Cette classe fait le pont entre Spring Security et notre base de données.
 * Elle implémente l'interface UserDetailsService de Spring Security.
 * 
 * POURQUOI C'EST NÉCESSAIRE?
 * Spring Security ne sait pas comment nos utilisateurs sont stockés.
 * En implémentant UserDetailsService, on lui dit:
 * "Voici comment charger un utilisateur à partir de son email"
 * 
 * QUAND EST-ELLE UTILISÉE?
 * 1. Lors de la connexion (login) - pour vérifier les credentials
 * 2. Lors de la validation du JWT - pour charger l'utilisateur complet
 * 
 * INTERFACE UserDetailsService:
 * Cette interface de Spring Security contient UNE seule méthode:
 * - loadUserByUsername(String username): UserDetails
 * 
 * Notre entité User implémente UserDetails, donc on peut la retourner directement.
 * 
 * ============================================================================
 */
@Service
@RequiredArgsConstructor
public class MtsUserDetailsService implements UserDetailsService {

    // =========================================================================
    // DÉPENDANCE INJECTÉE
    // =========================================================================
    
    /**
     * Repository JPA pour accéder à la table "users" en base de données.
     * 
     * Le mot-clé "final" combiné avec @RequiredArgsConstructor génère:
     * public MtsUserDetailsService(UserRepository userRepository) {
     *     this.userRepository = userRepository;
     * }
     */
    private final UserRepository userRepository;

    // =========================================================================
    // MÉTHODE PRINCIPALE
    // =========================================================================
    /**
     * Charge un utilisateur par son "username" (dans notre cas, l'email).
     * 
     * Cette méthode est appelée automatiquement par Spring Security:
     * - AuthenticationManager.authenticate() → appelle cette méthode
     * - JwtAuthenticationFilter → appelle cette méthode
     * 
     * FLUX:
     * 1. Reçoit l'email de l'utilisateur
     * 2. Cherche en base de données avec findByEmail()
     * 3. Si trouvé → retourne l'entité User (qui implémente UserDetails)
     * 4. Si non trouvé → lance UsernameNotFoundException
     * 
     * @param email L'email de l'utilisateur (appelé "username" par Spring Security)
     * @return UserDetails contenant les infos de l'utilisateur
     * @throws UsernameNotFoundException si l'utilisateur n'existe pas
     * 
     * NOTE: Spring Security appelle ce paramètre "username" par convention,
     * mais dans notre app on utilise l'email comme identifiant unique.
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // findByEmail retourne Optional<User>
        // orElseThrow lance une exception si l'Optional est vide
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with email: " + email));
    }
}
