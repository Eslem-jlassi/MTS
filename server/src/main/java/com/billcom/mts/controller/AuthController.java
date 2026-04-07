package com.billcom.mts.controller;

import com.billcom.mts.dto.auth.AuthResponse;
import com.billcom.mts.dto.auth.EmailAddressRequest;
import com.billcom.mts.dto.auth.GoogleLoginRequest;
import com.billcom.mts.dto.auth.LoginRequest;
import com.billcom.mts.dto.auth.PasswordResetConfirmRequest;
import com.billcom.mts.dto.auth.RegisterRequest;
import com.billcom.mts.entity.User;
import com.billcom.mts.exception.UnauthorizedException;
import com.billcom.mts.service.AuthService;
import com.billcom.mts.service.AuthRateLimitService;
import com.billcom.mts.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints d'authentification et d'inscription")
public class AuthController {

    public static final String AUTH_TOKEN = "mts_auth_token";
    public static final String REFRESH_TOKEN = "mts_refresh_token";

    private final AuthService authService;
    private final AuthRateLimitService authRateLimitService;
    private final UserService userService;
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${auth.expose-tokens-in-body:false}")
    private boolean exposeTokensInBody;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Inscrit un nouvel utilisateur (client par defaut)")
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        String clientIp = resolveClientIp(httpRequest);
        authRateLimitService.checkRegister(clientIp);

        AuthResponse authResponse = authService.register(request, clientIp);
        writeAuthCookies(authResponse, response);
        return sanitizeBrowserResponse(authResponse);
    }

    @PostMapping("/google")
    @Operation(summary = "Connexion ou inscription avec Google (token ID)")
    public AuthResponse googleLogin(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        AuthResponse authResponse = authService.googleLogin(request.getToken(), resolveClientIp(httpRequest));
        writeAuthCookies(authResponse, response);
        return sanitizeBrowserResponse(authResponse);
    }

    @PostMapping("/login")
    @Operation(summary = "Authentifie un utilisateur")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        String clientIp = resolveClientIp(httpRequest);
        authRateLimitService.checkLogin(clientIp);

        AuthResponse authResponse = authService.login(request, clientIp);
        writeAuthCookies(authResponse, response);
        return sanitizeBrowserResponse(authResponse);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renouvelle le token d'acces via le refresh token")
    public AuthResponse refreshToken(
            @CookieValue(name = REFRESH_TOKEN, required = false) String cookieRefreshToken,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        if (!StringUtils.hasText(cookieRefreshToken)) {
            throw new IllegalArgumentException("Le token de rafraichissement est requis");
        }

        AuthResponse authResponse = authService.refreshToken(cookieRefreshToken, resolveClientIp(httpRequest));
        writeAuthCookies(authResponse, response);
        return sanitizeBrowserResponse(authResponse);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Deconnecte l'utilisateur et revoque le refresh token")
    public void performLogout(
            @CookieValue(name = REFRESH_TOKEN, required = false) String cookieRefreshToken,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response) {
        clearAuthCookies(response);
        authService.logout(cookieRefreshToken);
        logoutHandler.logout(request, response, authentication);
    }

    @GetMapping("/me")
    @Operation(summary = "Recupere les infos de l'utilisateur connecte")
    public ResponseEntity<AuthResponse.UserInfo> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AuthResponse.UserInfo userInfo = AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .oauthProvider(user.getOauthProvider())
                .emailVerified(user.getEmailVerified())
                .build();

        return ResponseEntity.ok(userInfo);
    }

    @PostMapping("/register/admin")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cree un utilisateur avec n'importe quel role (Admin uniquement)")
    public AuthResponse registerByAdmin(
            @Valid @RequestBody RegisterRequest request,
            @AuthenticationPrincipal User admin,
            Authentication authentication) {
        Long adminId = resolveAuthenticatedUserId(admin, authentication);
        return sanitizeNonSessionResponse(authService.registerByAdmin(request, adminId));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Envoie un email de reinitialisation du mot de passe")
    public ResponseEntity<Map<String, Boolean>> forgotPassword(
            @Valid @RequestBody EmailAddressRequest request,
            HttpServletRequest httpRequest) {
        authRateLimitService.checkForgotPassword(resolveClientIp(httpRequest));
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reinitialise le mot de passe avec un token")
    public ResponseEntity<Map<String, Boolean>> resetPassword(
            @Valid @RequestBody PasswordResetConfirmRequest request,
            HttpServletRequest httpRequest) {
        authRateLimitService.checkResetPassword(resolveClientIp(httpRequest));
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/verify-email")
    @Operation(summary = "Verifie l'email d'un utilisateur avec un token")
    public ResponseEntity<Map<String, Boolean>> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Renvoie l'email de verification")
    public ResponseEntity<Map<String, Boolean>> resendVerification(
            @Valid @RequestBody EmailAddressRequest request,
            HttpServletRequest httpRequest) {
        authRateLimitService.checkResendVerification(resolveClientIp(httpRequest));
        authService.resendVerificationEmail(request.getEmail());
        return ResponseEntity.ok(Map.of("success", true));
    }

    private void writeAuthCookies(AuthResponse authResponse, HttpServletResponse response) {
        if (authResponse == null) {
            return;
        }

        if (StringUtils.hasText(authResponse.getAccessToken())) {
            ResponseCookie accessCookie = ResponseCookie.from(AUTH_TOKEN, authResponse.getAccessToken())
                    .httpOnly(true)
                    .maxAge(authResponse.getExpiresIn() / 1000)
                    .path("/")
                    .secure(cookieSecure)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        }

        if (StringUtils.hasText(authResponse.getRefreshToken())) {
            ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_TOKEN, authResponse.getRefreshToken())
                    .httpOnly(true)
                    .maxAge(7 * 24 * 60 * 60)
                    .path("/api/auth/refresh")
                    .secure(cookieSecure)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
        }
    }

    private void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie accessCookie = ResponseCookie.from(AUTH_TOKEN, "")
                .httpOnly(true)
                .maxAge(0)
                .path("/")
                .secure(cookieSecure)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_TOKEN, "")
                .httpOnly(true)
                .maxAge(0)
                .path("/api/auth/refresh")
                .secure(cookieSecure)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    private AuthResponse sanitizeBrowserResponse(AuthResponse authResponse) {
        if (exposeTokensInBody) {
            return authResponse;
        }
        return sanitizeNonSessionResponse(authResponse);
    }

    private AuthResponse sanitizeNonSessionResponse(AuthResponse authResponse) {
        if (authResponse == null) {
            return null;
        }

        return AuthResponse.builder()
                .accessToken(null)
                .refreshToken(null)
                .tokenType("Cookie")
                .expiresIn(authResponse.getExpiresIn())
                .user(authResponse.getUser())
                .emailVerificationRequired(authResponse.getEmailVerificationRequired())
                .emailVerificationSent(authResponse.getEmailVerificationSent())
                .build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(realIp)) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    private Long resolveAuthenticatedUserId(User authenticatedUser, Authentication authentication) {
        if (authenticatedUser != null && authenticatedUser.getId() != null) {
            return authenticatedUser.getId();
        }

        Authentication resolvedAuthentication = authentication != null
                ? authentication
                : SecurityContextHolder.getContext().getAuthentication();

        if (resolvedAuthentication != null && resolvedAuthentication.getName() != null) {
            return userService.getUserByEmail(resolvedAuthentication.getName()).getId();
        }

        throw new UnauthorizedException("Utilisateur authentifie introuvable");
    }
}
