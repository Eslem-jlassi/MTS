package com.billcom.mts.security;

// =============================================================================
// IMPORTS - Composants nécessaires pour le filtre JWT
// =============================================================================

import java.io.IOException;                     // Pour gérer les erreurs I/O
import java.util.Arrays;                        // Utilitaire pour les tableaux (cookies)

// Jakarta Servlet - API standard pour les servlets Java
import jakarta.servlet.FilterChain;             // Chaîne de filtres à exécuter
import jakarta.servlet.ServletException;        // Exception servlet
import jakarta.servlet.http.Cookie;             // Représente un cookie HTTP
import jakarta.servlet.http.HttpServletRequest; // Requête HTTP entrante
import jakarta.servlet.http.HttpServletResponse;// Réponse HTTP sortante

// Lombok - Annotations utilitaires
import lombok.NonNull;                          // Indique qu'un paramètre ne peut pas être null
import lombok.RequiredArgsConstructor;          // Génère le constructeur avec les champs final
import lombok.extern.slf4j.Slf4j;               // Logging

// Spring Security - Authentification
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;  // Contexte de sécurité
import org.springframework.security.core.userdetails.UserDetails;        // Détails utilisateur
import org.springframework.security.core.userdetails.UserDetailsService; // Service de chargement
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;  // Filtre exécuté une seule fois par requête

// Import du nom du cookie
import static com.billcom.mts.controller.AuthController.AUTH_TOKEN;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

// =============================================================================
// FILTRE D'AUTHENTIFICATION JWT
// =============================================================================
/**
 * ============================================================================
 * JwtAuthenticationFilter - Filtre pour valider les tokens JWT
 * ============================================================================
 * 
 * RÔLE DE CE FILTRE:
 * Ce filtre intercepte CHAQUE requête HTTP entrante et:
 * 1. Cherche un token JWT (dans le header ou les cookies)
 * 2. Valide le token
 * 3. Authentifie l'utilisateur dans le contexte Spring Security
 * 
 * POSITION DANS LA CHAÎNE:
 * Request → [JwtAuthenticationFilter] → ... → Controller → Response
 * 
 * Si le token est valide, l'utilisateur est "connecté" pour cette requête.
 * Les annotations @PreAuthorize et hasRole() peuvent ensuite vérifier ses droits.
 * 
 * HÉRITAGE: OncePerRequestFilter
 * Cette classe garantit que le filtre n'est exécuté qu'UNE SEULE fois par requête,
 * même si la requête est forwardée ou incluse plusieurs fois.
 * 
 * ============================================================================
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    // =========================================================================
    // DÉPENDANCES INJECTÉES
    // =========================================================================
    
    /** Service JWT pour valider et extraire les infos des tokens */
    private final JwtService jwtService;
    
    /** Service pour charger les détails de l'utilisateur depuis la BDD */
    private final UserDetailsService userDetailsService;

    // =========================================================================
    // MÉTHODE PRINCIPALE DU FILTRE
    // =========================================================================
    /**
     * Méthode exécutée pour chaque requête HTTP.
     * 
     * FLUX D'EXÉCUTION:
     * 1. Extraire le token JWT de la requête (header ou cookie)
     * 2. Si pas de token ou token expiré → continuer sans authentification
     * 3. Extraire l'email du token
     * 4. Charger l'utilisateur depuis la BDD
     * 5. Valider le token pour cet utilisateur
     * 6. Créer l'authentification dans le contexte Spring Security
     * 7. Passer au filtre suivant
     * 
     * @param request La requête HTTP entrante
     * @param response La réponse HTTP (non utilisée ici)
     * @param filterChain La chaîne de filtres à continuer
     */
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        // =====================================================================
        // ÉTAPE 1: EXTRACTION DU TOKEN
        // =====================================================================
        
        // D'abord, on essaie de récupérer le token depuis le header Authorization
        // Format attendu: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
        String token = extractTokenFromHeader(request);
        log.debug("[JWT Filter] Token from header: {}", token != null ? "Found" : "Not found");
        
        // Si pas de token dans le header, on cherche dans les cookies
        // Utile pour les requêtes depuis un navigateur (les cookies sont envoyés automatiquement)
        if (token == null) {
            token = extractTokenFromCookie(request);
            log.debug("[JWT Filter] Token from cookie: {}", token != null ? "Found" : "Not found");
        }
        
        // =====================================================================
        // ÉTAPE 2: VÉRIFICATION DE BASE
        // =====================================================================
        
        // Si aucun token trouvé → On continue sans authentifier
        if (token == null) {
            log.debug("[JWT Filter] No token found for {}", request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }
        
        log.debug("[JWT Filter] Processing token for {}", request.getRequestURI());
        
        // Vérifier si le token est valide (format correct et non expiré)
        // Si le token est malformé ou expiré, on continue sans authentifier
        try {
            if (jwtService.isTokenExpired(token)) {
                log.warn("[JWT Filter] Token expired for {}", request.getRequestURI());
                filterChain.doFilter(request, response);
                return;  // Token expiré, on continue sans authentifier
            }
        } catch (Exception e) {
            // Token malformé ou invalide - on continue sans authentifier
            // Les endpoints protégés retourneront 401/403
            log.error("[JWT Filter] Invalid token for {}: {}", request.getRequestURI(), e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        // =====================================================================
        // ÉTAPE 3: EXTRACTION DE L'EMAIL
        // =====================================================================
        
        // Décode le token et récupère le "subject" (email de l'utilisateur)
        String username = jwtService.extractUsername(token);
        log.debug("[JWT Filter] Extracted username: {}", username);
        
        // =====================================================================
        // ÉTAPE 4: VÉRIFICATION DU CONTEXTE DE SÉCURITÉ
        // =====================================================================
        
        // isNotBlank: vérifie que l'email n'est pas null, vide ou juste des espaces
        // getAuthentication() == null: vérifie qu'on n'a pas déjà authentifié l'utilisateur
        // (évite de refaire le travail si un autre filtre l'a fait)
        if (isNotBlank(username) && SecurityContextHolder.getContext().getAuthentication() == null) {
            
            // =================================================================
            // ÉTAPE 5: CHARGEMENT DE L'UTILISATEUR
            // =================================================================
            
            // Charge l'utilisateur complet depuis la base de données
            // Cela permet de vérifier que l'utilisateur existe toujours et est actif
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            log.debug("[JWT Filter] Loaded user: {}, authorities: {}", username, userDetails.getAuthorities());

            // =================================================================
            // ÉTAPE 6: VALIDATION DU TOKEN
            // =================================================================
            
            // Vérifie que:
            // 1. L'email dans le token correspond à l'utilisateur chargé
            // 2. Le token n'est pas expiré
            if (jwtService.isTokenValid(token, userDetails)) {
                log.debug("[JWT Filter] Token is valid for user: {}", username);
                
                // =============================================================
                // ÉTAPE 7: CRÉATION DE L'AUTHENTIFICATION
                // =============================================================
                
                // Crée un objet d'authentification Spring Security
                // Paramètres:
                // - userDetails: l'utilisateur authentifié (principal)
                // - null: les credentials (mot de passe) - pas besoin, on a déjà validé
                // - authorities: les rôles/permissions de l'utilisateur
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()  // Ex: [ROLE_ADMIN, ROLE_CLIENT]
                );
                
                // Ajoute des détails supplémentaires (IP, session ID, etc.)
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // =============================================================
                // ÉTAPE 8: STOCKAGE DANS LE CONTEXTE
                // =============================================================
                
                // Place l'authentification dans le SecurityContext
                // À partir de maintenant, Spring Security considère l'utilisateur comme connecté
                // @PreAuthorize, hasRole(), etc. peuvent maintenant fonctionner
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.info("[JWT Filter] User {} authenticated successfully with roles: {}", username, userDetails.getAuthorities());
            } else {
                log.warn("[JWT Filter] Token validation failed for user: {}", username);
            }
        }

        // =====================================================================
        // ÉTAPE 9: CONTINUER LA CHAÎNE
        // =====================================================================
        
        // Passe au filtre suivant (ou au controller si c'est le dernier filtre)
        filterChain.doFilter(request, response);
    }
    
    // =========================================================================
    // MÉTHODES D'EXTRACTION DU TOKEN
    // =========================================================================
    
    /**
     * Extrait le token JWT du header Authorization.
     * 
     * FORMAT STANDARD:
     * Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGVtYWlsLmNvbSJ9.signature
     * 
     * "Bearer " = 7 caractères, donc on utilise substring(7) pour récupérer le token
     * 
     * @param request La requête HTTP
     * @return Le token JWT ou null si non trouvé
     */
    private String extractTokenFromHeader(HttpServletRequest request) {
        // Récupère le header "Authorization"
        String authHeader = request.getHeader("Authorization");
        
        // Vérifie que le header existe et commence par "Bearer "
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            // Retourne tout ce qui suit "Bearer " (7 caractères)
            return authHeader.substring(7);
        }
        return null;
    }
    
    /**
     * Extrait le token JWT des cookies.
     * 
     * Utile quand le frontend stocke le token dans un cookie httpOnly
     * (plus sécurisé car inaccessible par JavaScript)
     * 
     * @param request La requête HTTP
     * @return Le token JWT ou null si non trouvé
     */
    private String extractTokenFromCookie(HttpServletRequest request) {
        // Récupère tous les cookies de la requête
        Cookie[] cookies = request.getCookies();
        
        // Si aucun cookie, retourne null
        if (cookies == null) {
            return null;
        }
        
        // Utilise les Streams Java 8 pour chercher le cookie
        return Arrays.stream(cookies)                    // Convertit le tableau en Stream
                .filter(cookie -> cookie.getName().equals(AUTH_TOKEN))  // Filtre par nom
                .map(Cookie::getValue)                   // Extrait la valeur du cookie
                .findAny()                               // Prend le premier trouvé
                .orElse(null);                           // Retourne null si non trouvé
    }
}
