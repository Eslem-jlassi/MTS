package com.billcom.mts.controller;

// =============================================================================
// IMPORTS - Toutes les dépendances nécessaires au controller
// =============================================================================

// DTOs - Objets de transfert de données pour les requêtes/réponses
import com.billcom.mts.dto.auth.AuthResponse;     // Réponse d'authentification (token + user)
import com.billcom.mts.dto.auth.GoogleLoginRequest;
import com.billcom.mts.dto.auth.LoginRequest;     // Requête de connexion (email + password)
import com.billcom.mts.dto.auth.RegisterRequest;  // Requête d'inscription

// Entité User
import com.billcom.mts.entity.User;

// Service d'authentification (logique métier)
import com.billcom.mts.service.AuthService;

// Swagger/OpenAPI - Documentation automatique de l'API
import io.swagger.v3.oas.annotations.Operation;   // Décrit une opération
import io.swagger.v3.oas.annotations.tags.Tag;     // Regroupe les endpoints

// Jakarta Servlet - Requête/Réponse HTTP
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Jakarta Validation - Validation des données entrées
import jakarta.validation.Valid;

// Lombok
import lombok.RequiredArgsConstructor;

// Spring HTTP - Gestion des headers, cookies, réponses
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;   // Pour créer des cookies
import org.springframework.http.ResponseEntity;   // Réponse HTTP typée

// Spring Security - Authentification
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal; // Injecte l'user connecté
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;

// Spring Web - Annotations REST
import org.springframework.web.bind.annotation.*;

// =============================================================================
// CONTROLLER D'AUTHENTIFICATION
// =============================================================================
/**
 * ============================================================================
 * AuthController - Contrôleur REST pour l'authentification
 * ============================================================================
 * 
 * RÔLE DE CE CONTROLLER:
 * Gère tous les endpoints liés à l'authentification:
 * - POST /api/auth/register → Inscription d'un nouveau client
 * - POST /api/auth/login → Connexion
 * - POST /api/auth/refresh → Renouvellement du token
 * - POST /api/auth/logout → Déconnexion
 * - GET /api/auth/me → Infos de l'utilisateur connecté
 * - POST /api/auth/register/admin → Création de compte par admin
 * 
 * ARCHITECTURE MVC:
 * Controller → Service → Repository → Database
 * 
 * Le controller:
 * - Reçoit les requêtes HTTP
 * - Valide les données d'entrée
 * - Appelle le service
 * - Retourne la réponse HTTP
 * 
 * ANNOTATIONS:
 * @RestController: Combine @Controller + @ResponseBody
 *                  Tous les retours sont automatiquement convertis en JSON
 * @RequestMapping: Préfixe d'URL pour tous les endpoints du controller
 * @Tag: Documentation Swagger (visible sur /swagger-ui.html)
 * 
 * ============================================================================
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints d'authentification et d'inscription")
public class AuthController {

    // =========================================================================
    // CONSTANTES - Noms des cookies
    // =========================================================================
    
    /**
     * Nom du cookie contenant le token d'accès JWT.
     * Ce cookie est envoyé automatiquement par le navigateur à chaque requête.
     */
    public static final String AUTH_TOKEN = "mts_auth_token";
    
    /**
     * Nom du cookie contenant le token de rafraîchissement.
     * Utilisé uniquement pour renouveler le token d'accès.
     */
    public static final String REFRESH_TOKEN = "mts_refresh_token";

    // =========================================================================
    // DÉPENDANCES INJECTÉES
    // =========================================================================
    
    /** Service contenant la logique d'authentification */
    private final AuthService authService;
    
    /** Handler Spring Security pour la déconnexion */
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    /** Cookie secure flag — set to true in production (HTTPS) */
    @org.springframework.beans.factory.annotation.Value("${cookie.secure:false}")
    private boolean cookieSecure;

    // =========================================================================
    // ENDPOINT: Inscription d'un nouveau client
    // =========================================================================
    /**
     * POST /api/auth/register - Inscrit un nouvel utilisateur.
     * 
     * ANNOTATIONS:
     * @PostMapping: Gère les requêtes POST
     * @ResponseStatus(CREATED): Retourne 201 au lieu de 200
     * @Operation: Documentation Swagger
     * @Valid: Déclenche la validation des annotations (@NotBlank, @Email, etc.)
     * @RequestBody: Convertit le JSON de la requête en objet Java
     * 
     * @param request Données d'inscription (validées automatiquement)
     * @return AuthResponse avec token et infos utilisateur
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Inscrit un nouvel utilisateur (client par défaut)")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        // Délègue la logique au service
        return authService.register(request);
    }

    // =========================================================================
    // ENDPOINT: Connexion / Inscription avec Google
    // =========================================================================
    /**
     * POST /api/auth/google - Authentifie ou inscrit un utilisateur avec un token Google ID.
     * Si l'email n'existe pas, crée un compte CLIENT.
     */
    @PostMapping("/google")
    @Operation(summary = "Connexion ou inscription avec Google (token ID)")
    public AuthResponse googleLogin(@Valid @RequestBody GoogleLoginRequest request,
                                    HttpServletRequest httpRequest,
                                    HttpServletResponse response) {
        AuthResponse authResponse = authService.googleLogin(request.getToken(), httpRequest.getRemoteAddr());

        // Cookies HTTP-only identiques au login classique
        ResponseCookie accessCookie = ResponseCookie.from(AUTH_TOKEN, authResponse.getAccessToken())
                .httpOnly(true)
                .maxAge(authResponse.getExpiresIn() / 1000)
                .path("/")
                .secure(cookieSecure)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_TOKEN, authResponse.getRefreshToken())
                .httpOnly(true)
                .maxAge(7 * 24 * 60 * 60)
                .path("/api/auth/refresh")
                .secure(cookieSecure)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        return authResponse;
    }

    // =========================================================================
    // ENDPOINT: Connexion
    // =========================================================================
    /**
     * POST /api/auth/login - Authentifie un utilisateur.
     * 
     * PARTICULARITÉ: Stocke les tokens dans des cookies HTTP-only.
     * 
     * COOKIES HTTP-ONLY:
     * - Inaccessibles par JavaScript (protection XSS)
     * - Envoyés automatiquement par le navigateur
     * - Plus sécurisés que localStorage pour les tokens
     * 
     * @param request Email et mot de passe
     * @param response HttpServletResponse pour ajouter les cookies
     * @return AuthResponse avec les tokens et infos utilisateur
     */
    @PostMapping("/login")
    @Operation(summary = "Authentifie un utilisateur")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        // Appelle le service pour vérifier les credentials et générer les tokens
        AuthResponse authResponse = authService.login(request, httpRequest.getRemoteAddr());
        
        // =====================================================================
        // CRÉATION DU COOKIE ACCESS TOKEN
        // =====================================================================
        // ResponseCookie.from(nom, valeur): Crée un cookie
        // .httpOnly(true): Cookie inaccessible par JavaScript
        // .maxAge(): Durée de vie en secondes
        // .path("/"): Cookie envoyé pour toutes les URLs
        // .secure(true): Cookie envoyé uniquement en HTTPS (mettre true en prod!)
        // .sameSite("Lax"): Protection contre CSRF
        ResponseCookie accessCookie = ResponseCookie.from(AUTH_TOKEN, authResponse.getAccessToken())
                .httpOnly(true)
                .maxAge(authResponse.getExpiresIn() / 1000) // Convertit ms en secondes
                .path("/")
                .secure(cookieSecure)
                .sameSite("Lax")
                .build();
        // Ajoute le cookie dans la réponse HTTP
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        // =====================================================================
        // CRÉATION DU COOKIE REFRESH TOKEN
        // =====================================================================
        // path("/api/auth/refresh"): Cookie envoyé UNIQUEMENT pour cet endpoint
        // Plus sécurisé car le refresh token a une longue durée de vie
        ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_TOKEN, authResponse.getRefreshToken())
                .httpOnly(true)
                .maxAge(7 * 24 * 60 * 60) // 7 jours en secondes
                .path("/api/auth/refresh")  // Uniquement pour le refresh!
                .secure(cookieSecure)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
        
        return authResponse;
    }

    // =========================================================================
    // ENDPOINT: Rafraîchissement du token
    // =========================================================================
    /**
     * POST /api/auth/refresh - Renouvelle le token d'accès.
     * 
     * POURQUOI RAFRAÎCHIR?
     * Le token d'accès a une courte durée de vie (ex: 1h) pour limiter les risques.
     * Le refresh token, plus long (7j), permet d'obtenir un nouveau token d'accès.
     * 
     * @CookieValue: Récupère automatiquement la valeur du cookie spécifié
     * 
     * @param refreshToken Token de rafraîchissement (depuis le cookie)
     * @param response Pour mettre à jour le cookie
     * @return Nouvelle AuthResponse avec nouveau token
     */
    @PostMapping("/refresh")
    @Operation(summary = "Renouvelle le token d'accès via le refresh token")
    public AuthResponse refreshToken(
            @CookieValue(name = REFRESH_TOKEN, required = false) String cookieRefreshToken,
            @RequestBody(required = false) java.util.Map<String, String> body,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        
        // Accepte le refresh token depuis: cookie OU body JSON
        String refreshToken = cookieRefreshToken;
        if ((refreshToken == null || refreshToken.isEmpty()) && body != null) {
            refreshToken = body.get("refreshToken");
        }
        if (refreshToken == null || refreshToken.isEmpty()) {
            throw new IllegalArgumentException("Le token de rafraîchissement est requis");
        }

        AuthResponse authResponse = authService.refreshToken(refreshToken, httpRequest.getRemoteAddr());
        
        // Met à jour les cookies
        ResponseCookie accessCookie = ResponseCookie.from(AUTH_TOKEN, authResponse.getAccessToken())
                .httpOnly(true)
                .maxAge(authResponse.getExpiresIn() / 1000)
                .path("/")
                .secure(cookieSecure)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        ResponseCookie newRefreshCookie = ResponseCookie.from(REFRESH_TOKEN, authResponse.getRefreshToken())
                .httpOnly(true)
                .maxAge(7 * 24 * 60 * 60)
                .path("/api/auth/refresh")
                .secure(cookieSecure)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, newRefreshCookie.toString());
        
        return authResponse;
    }

    // =========================================================================
    // ENDPOINT: Déconnexion
    // =========================================================================
    /**
     * POST /api/auth/logout - Déconnecte l'utilisateur.
     * 
     * ACTIONS:
     * 1. Supprime les cookies (maxAge=0 les supprime)
     * 2. Ajoute le token à la liste noire (côté service)
     * 3. Nettoie le SecurityContext de Spring
     * 
     * @param token Token actuel (pour l'ajouter à la blacklist)
     * @param authentication Contexte d'authentification Spring
     * @param request Requête HTTP
     * @param response Réponse HTTP
     */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Déconnecte l'utilisateur et révoque le refresh token")
    public void performLogout(
            @CookieValue(name = AUTH_TOKEN, required = false) String token,
            @CookieValue(name = REFRESH_TOKEN, required = false) String cookieRefreshToken,
            @RequestBody(required = false) java.util.Map<String, String> body,
            Authentication authentication, 
            HttpServletRequest request, 
            HttpServletResponse response) {
        
        // Suppression des cookies
        ResponseCookie accessCookie = ResponseCookie.from(AUTH_TOKEN, "")
                .httpOnly(true).maxAge(0).path("/").secure(cookieSecure).build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_TOKEN, "")
                .httpOnly(true).maxAge(0).path("/api/auth/refresh").secure(cookieSecure).build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        // Révoquer le refresh token (cookie ou body)
        String refreshToken = cookieRefreshToken;
        if ((refreshToken == null || refreshToken.isEmpty()) && body != null) {
            refreshToken = body.get("refreshToken");
        }
        authService.logout(refreshToken);
        
        logoutHandler.logout(request, response, authentication);
    }

    // =========================================================================
    // ENDPOINT: Infos utilisateur connecté
    // =========================================================================
    /**
     * GET /api/auth/me - Retourne les infos de l'utilisateur connecté.
     * 
     * @AuthenticationPrincipal: Injecte automatiquement l'utilisateur authentifié.
     * Spring le récupère depuis le SecurityContext (mis par le JwtAuthenticationFilter).
     * 
     * @param user L'utilisateur connecté (injecté par Spring)
     * @return Les infos de l'utilisateur ou 401 si non connecté
     */
    @GetMapping("/me")
    @Operation(summary = "Récupère les infos de l'utilisateur connecté")
    public ResponseEntity<AuthResponse.UserInfo> getCurrentUser(@AuthenticationPrincipal User user) {
        // Si pas d'utilisateur dans le contexte, renvoie 401 Unauthorized
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Construit un DTO avec les infos essentielles (pas le mot de passe!)
        AuthResponse.UserInfo userInfo = AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .oauthProvider(user.getOauthProvider())
                .build();

        return ResponseEntity.ok(userInfo);
    }

    // =========================================================================
    // ENDPOINT: Création de compte par admin
    // =========================================================================
    /**
     * POST /api/auth/register/admin - Crée un utilisateur avec n'importe quel rôle.
     * 
     * RESTRICTION: Seuls les admins peuvent utiliser cet endpoint.
     * Cela est géré par la configuration de sécurité (SecurityConfig).
     * 
     * @param request Données d'inscription incluant le rôle
     * @param admin L'admin qui fait la création
     * @return AuthResponse avec les infos du nouvel utilisateur
     */
    @PostMapping("/register/admin")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crée un utilisateur avec n'importe quel rôle (Admin uniquement)")
    public AuthResponse registerByAdmin(
            @Valid @RequestBody RegisterRequest request,
            @AuthenticationPrincipal User admin) {
        // L'ID de l'admin est passé pour traçabilité
        return authService.registerByAdmin(request, admin.getId());
    }

    // =========================================================================
    // ENDPOINT: Mot de passe oublié
    // =========================================================================
    /**
     * POST /api/auth/forgot-password - Demande un email de réinitialisation.
     * Retourne toujours 200 OK (sécurité : ne pas révéler si l'email existe).
     */
    @PostMapping("/forgot-password")
    @Operation(summary = "Envoie un email de réinitialisation du mot de passe")
    public ResponseEntity<java.util.Map<String, Boolean>> forgotPassword(
            @RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        authService.forgotPassword(email);
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }

    // =========================================================================
    // ENDPOINT: Réinitialisation du mot de passe
    // =========================================================================
    /**
     * POST /api/auth/reset-password - Réinitialise le mot de passe avec un token.
     */
    @PostMapping("/reset-password")
    @Operation(summary = "Réinitialise le mot de passe avec un token")
    public ResponseEntity<java.util.Map<String, Boolean>> resetPassword(
            @RequestBody java.util.Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        authService.resetPassword(token, newPassword);
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }

    // =========================================================================
    // ENDPOINT: Vérification d'email
    // =========================================================================
    /**
     * GET /api/auth/verify-email?token=xxx - Vérifie l'email d'un utilisateur.
     */
    @GetMapping("/verify-email")
    @Operation(summary = "Vérifie l'email d'un utilisateur avec un token")
    public ResponseEntity<java.util.Map<String, Boolean>> verifyEmail(
            @RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }

    // =========================================================================
    // ENDPOINT: Renvoi de l'email de vérification
    // =========================================================================
    /**
     * POST /api/auth/resend-verification - Renvoie l'email de vérification.
     */
    @PostMapping("/resend-verification")
    @Operation(summary = "Renvoie l'email de vérification")
    public ResponseEntity<java.util.Map<String, Boolean>> resendVerification(
            @RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        authService.resendVerificationEmail(email);
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }
}
// =============================================================================
// FIN DU CONTROLLER D'AUTHENTIFICATION
// =============================================================================
