package com.billcom.mts.config;

// =============================================================================
// IMPORTS - Configuration de la sécurité Spring Security
// =============================================================================

// Gestionnaires d'exceptions personnalisés
import com.billcom.mts.config.handler.FilterChainExceptionHandler;
import com.billcom.mts.config.handler.RestAccessDeniedHandler;
import com.billcom.mts.config.handler.RestAuthenticationEntryPoint;

// Service de chargement des utilisateurs pour l'authentification
import com.billcom.mts.security.MtsUserDetailsService;

// Filtre JWT personnalisé pour valider les tokens
import com.billcom.mts.security.JwtAuthenticationFilter;

// Lombok - Génération automatique de code
import lombok.RequiredArgsConstructor;

// Annotations Spring
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;

// Spring Security - Classes et interfaces de sécurité
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutFilter;

import static org.springframework.security.config.Customizer.withDefaults;

// =============================================================================
// CONFIGURATION DE SÉCURITÉ - Classe principale
// =============================================================================
/**
 * ============================================================================
 * SecurityConfig - Configuration de la sécurité de l'application
 * ============================================================================
 * 
 * OBJECTIF:
 * Cette classe configure toute la sécurité de l'application:
 * - Authentification JWT (stateless, sans session serveur)
 * - Autorisation basée sur les rôles (RBAC - Role Based Access Control)
 * - Protection des endpoints API
 * - Configuration des filtres de sécurité
 * 
 * ANNOTATIONS:
 * @Configuration       → Indique que c'est une classe de configuration Spring
 * @EnableWebSecurity   → Active la sécurité web Spring Security
 * @EnableMethodSecurity → Permet d'utiliser @PreAuthorize sur les méthodes
 * 
 * ARCHITECTURE JWT:
 * 1. Le client envoie ses credentials (email/password)
 * 2. Le serveur vérifie et génère un token JWT
 * 3. Le client stocke le token et l'envoie dans chaque requête (Header Authorization)
 * 4. Le filtre JWT valide le token et authentifie l'utilisateur
 * 
 * ============================================================================
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    // =========================================================================
    // CONSTANTES - Endpoints publics et rôles
    // =========================================================================
    
    /**
     * Liste des endpoints accessibles SANS authentification.
     * 
     * ATTENTION: Bien réfléchir avant d'ajouter un endpoint ici!
     * Ces endpoints sont exposés publiquement.
     * 
     * Contenu:
     * - /api/auth/login et /register → Connexion et inscription
     * - /api/auth/refresh → Renouvellement du token
     * - /swagger-ui/** → Documentation API (à désactiver en production!)
     * - /actuator/health → Vérification de santé (pour les load balancers)
     * - /ws/** → WebSocket endpoints (l'auth est gérée par l'intercepteur STOMP)
     */
    private static final String[] PUBLIC_ENDPOINTS = new String[] {
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/google",
            "/api/auth/refresh",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/verify-email",
            "/api/auth/resend-verification",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/actuator/health",
            "/ws/**"  // WebSocket endpoints - auth gérée par WebSocketAuthInterceptor
    };

    /**
     * Constantes pour les noms de rôles.
     * Spring Security ajoute automatiquement le préfixe "ROLE_" en interne.
     * Donc hasRole("ADMIN") vérifie en fait "ROLE_ADMIN".
     */
    private static final String ADMIN = "ADMIN";
    private static final String MANAGER = "MANAGER";
    private static final String AGENT = "AGENT";
    private static final String CLIENT = "CLIENT";

    // =========================================================================
    // DÉPENDANCES INJECTÉES
    // =========================================================================
    
    /** Gestionnaire d'exceptions dans la chaîne de filtres */
    private final FilterChainExceptionHandler filterChainExceptionHandler;
    
    /** Filtre JWT pour valider les tokens dans chaque requête */
    private final JwtAuthenticationFilter jwtAuthFilter;
    
    /** Service pour charger les détails utilisateur depuis la BDD */
    private final MtsUserDetailsService userDetailsService;

    /** Point d'entrée pour les requêtes non authentifiées (retourne 401) */
    private final RestAuthenticationEntryPoint authenticationEntryPoint;

    /** Gestionnaire pour les accès refusés (retourne 403) */
    private final RestAccessDeniedHandler accessDeniedHandler;

    // =========================================================================
    // BEAN: CHAÎNE DE FILTRES DE SÉCURITÉ
    // =========================================================================
    /**
     * Configure la chaîne de filtres de sécurité HTTP.
     * 
     * ORDRE DES FILTRES:
     * Request → FilterChainExceptionHandler → JwtFilter → ... → Controller
     * 
     * PATTERN BUILDER:
     * On utilise le pattern Builder fluent pour construire la configuration.
     * Chaque méthode retourne l'objet HttpSecurity pour enchaîner les appels.
     * 
     * @param http L'objet HttpSecurity à configurer
     * @return SecurityFilterChain configurée
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // ============================================================
                // CONFIGURATION CORS (Cross-Origin Resource Sharing)
                // ============================================================
                // Permet les requêtes depuis un domaine différent (React sur localhost:3000)
                .cors(withDefaults())
                
                // ============================================================
                // DÉSACTIVATION CSRF (Cross-Site Request Forgery)
                // ============================================================
                // CSRF est nécessaire pour les apps avec sessions (cookies)
                // Avec JWT, on peut le désactiver car le token doit être
                // explicitement inclus dans chaque requête
                .csrf(AbstractHttpConfigurer::disable)
                
                // ============================================================
                // RÈGLES D'AUTORISATION DES ENDPOINTS
                // ============================================================
                .authorizeHttpRequests(auth -> auth
                        // ----------------------------------------
                        // ENDPOINTS PUBLICS (sans authentification)
                        // ----------------------------------------
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        
                        // ----------------------------------------
                        // ENDPOINTS ADMIN UNIQUEMENT
                        // ----------------------------------------
                        // hasRole("ADMIN") vérifie que l'utilisateur a le rôle ADMIN
                        .requestMatchers("/api/admin/**").hasRole(ADMIN)
                        .requestMatchers("/api/auth/register/admin").hasRole(ADMIN)
                        // Création/Modification/Suppression de services télécom (ADMIN + MANAGER)
                        .requestMatchers(HttpMethod.POST, "/api/services/**").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.PUT, "/api/services/**").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.DELETE, "/api/services/**").hasAnyRole(ADMIN, MANAGER)
                        
                        // ----------------------------------------
                        // ENDPOINTS MANAGER (+ ADMIN par héritage)
                        // ----------------------------------------
                        .requestMatchers("/api/dashboard/stats", "/api/dashboard/stats/**").authenticated()
                        // hasAnyRole = plusieurs rôles autorisés
                        .requestMatchers("/api/tickets/*/assign").hasAnyRole(ADMIN, MANAGER)
                        .requestMatchers("/api/reports/**").hasAnyRole(ADMIN, MANAGER)
                        
                        // ----------------------------------------
                        // ENDPOINTS AGENT (+ MANAGER + ADMIN)
                        // ----------------------------------------
                        .requestMatchers("/api/tickets/*/status").hasAnyRole(ADMIN, MANAGER, AGENT)
                        .requestMatchers("/api/tickets/*/comments").authenticated()
                        
                        // ----------------------------------------
                        // ENDPOINTS CLIENT
                        // ----------------------------------------
                        // Clients, managers et admins peuvent créer des tickets
                        .requestMatchers(HttpMethod.POST, "/api/tickets").hasAnyRole(CLIENT, ADMIN, MANAGER)
                        
                        // ----------------------------------------
                        // GESTION DES UTILISATEURS (ADMIN)
                        // ----------------------------------------
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/role").hasRole(ADMIN)
                        .requestMatchers("/api/users/*/activate").hasRole(ADMIN)
                        .requestMatchers("/api/users/*/deactivate").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.GET, "/api/users").hasAnyRole(ADMIN, MANAGER)
                        
                        // ----------------------------------------
                        // NOTIFICATIONS (tous utilisateurs authentifiés)
                        // ----------------------------------------
                        .requestMatchers("/api/notifications/**").authenticated()
                        
                        // ----------------------------------------
                        // TOUS LES UTILISATEURS AUTHENTIFIÉS
                        // ----------------------------------------
                        .requestMatchers("/api/tickets/**").authenticated()
                        .requestMatchers("/api/users/me/**").authenticated()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/auth/logout").authenticated()
                        .requestMatchers("/api/services/my-services").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/services/**").authenticated()
                        .requestMatchers("/api/dashboard/my-stats").authenticated()
                        .requestMatchers("/api/clients/**").authenticated()
                        
                        // ----------------------------------------
                        // PAR DÉFAUT: Authentification requise
                        // ----------------------------------------
                        // Tout endpoint non listé ci-dessus nécessite une authentification
                        .anyRequest().authenticated()
                )
                
                // ============================================================
                // GESTION DES EXCEPTIONS D'AUTHENTIFICATION
                // ============================================================
                // authenticationEntryPoint: Retourne 401 JSON si non authentifié
                // accessDeniedHandler: Retourne 403 JSON si authentifié mais pas autorisé
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )
                
                // ============================================================
                // GESTION DES SESSIONS
                // ============================================================
                // STATELESS = Pas de session côté serveur
                // Chaque requête doit contenir le token JWT
                // Avantages: Scalabilité, pas de problème de sticky sessions
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                
                // ============================================================
                // AJOUT DES FILTRES PERSONNALISÉS
                // ============================================================
                // addFilterBefore: Ajoute notre filtre AVANT un filtre existant
                
                // Le filtre JWT s'exécute AVANT UsernamePasswordAuthenticationFilter
                // Il intercepte chaque requête et vérifie le token JWT
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                
                // Le gestionnaire d'exceptions s'exécute en premier
                // pour capturer les erreurs des autres filtres
                .addFilterBefore(filterChainExceptionHandler, LogoutFilter.class)
                
                // ============================================================
                // SERVICE DE CHARGEMENT DES UTILISATEURS
                // ============================================================
                // Spring Security utilise ce service pour charger les détails
                // de l'utilisateur lors de l'authentification
                .userDetailsService(userDetailsService)
                
                // Construction finale de la chaîne
                .build();
    }

    // =========================================================================
    // BEAN: ENCODEUR DE MOTS DE PASSE
    // =========================================================================
    /**
     * Fournit l'encodeur BCrypt pour hasher les mots de passe.
     * 
     * BCRYPT:
     * - Algorithme de hachage adaptatif (le coût augmente avec le temps)
     * - Inclut un salt aléatoire automatiquement
     * - Résistant aux attaques rainbow table et brute force
     * 
     * UTILISATION:
     * - À l'inscription: passwordEncoder.encode(rawPassword)
     * - À la connexion: passwordEncoder.matches(rawPassword, hashedPassword)
     * 
     * @return Encodeur BCrypt
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // =========================================================================
    // BEAN: GESTIONNAIRE D'AUTHENTIFICATION
    // =========================================================================
    /**
     * Expose le gestionnaire d'authentification comme Bean.
     * 
     * Ce gestionnaire est utilisé par AuthService pour authentifier
     * les utilisateurs lors de la connexion.
     * 
     * Il coordonne:
     * - Le chargement de l'utilisateur (via UserDetailsService)
     * - La vérification du mot de passe (via PasswordEncoder)
     * 
     * @param authenticationConfiguration Configuration d'authentification Spring
     * @return AuthenticationManager
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
