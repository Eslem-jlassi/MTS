package com.billcom.mts.service.impl;

import com.billcom.mts.dto.auth.AuthResponse;
import com.billcom.mts.dto.auth.LoginRequest;
import com.billcom.mts.dto.auth.RegisterRequest;
import com.billcom.mts.entity.Client;
import com.billcom.mts.entity.RefreshToken;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.BadRequestException;
import com.billcom.mts.exception.ForbiddenException;
import com.billcom.mts.exception.UnauthorizedException;
import com.billcom.mts.repository.ClientRepository;
import com.billcom.mts.repository.UserRepository;
import com.billcom.mts.security.JwtService;
import com.billcom.mts.service.AuthService;
import com.billcom.mts.service.RefreshTokenService;
import com.billcom.mts.service.EmailService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

/**
 * Implémentation du service d'authentification.
 * 
 * Gère: login, register (avec contrôle des rôles), refresh token, logout.
 * La propriété mts.allow-internal-signup contrôle si les rôles internes
 * (AGENT, MANAGER, ADMIN) peuvent être créés via l'inscription publique.
 * 
 * @author Billcom Consulting - PFE 2026
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenService refreshTokenService;
    private final EmailService emailService;

    /** Contrôle si l'inscription multi-rôle est autorisée (dev uniquement) */
    @Value("${mts.allow-internal-signup:false}")
    private boolean allowInternalSignup;

    /** Google OAuth Client ID (same as frontend) for ID token verification */
    @Value("${app.google.client-id:}")
    private String googleClientId;

    // =========================================================================
    // LOGIN
    // =========================================================================
    @Override
    public AuthResponse login(LoginRequest request, String clientIp) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            User user = (User) authentication.getPrincipal();
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);

            RefreshToken refreshToken = refreshTokenService.createRefreshToken(
                user, clientIp, "web-client"
            );

            log.info("Login réussi: {} ({})", user.getEmail(), user.getRole());
            return createAuthResponse(user, refreshToken.getToken());

        } catch (AuthenticationException e) {
            log.warn("Tentative de connexion échouée pour: {}", request.getEmail());
            throw new UnauthorizedException("Email ou mot de passe incorrect");
        }
    }

    // =========================================================================
    // REGISTER - Inscription publique (contrôle des rôles)
    // =========================================================================
    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        UserRole role = request.getRole() != null ? request.getRole() : UserRole.CLIENT;

        if (role != UserRole.CLIENT && !allowInternalSignup) {
            throw new ForbiddenException(
                "L'inscription avec le rôle " + role + " n'est pas autorisée. " +
                "Contactez un administrateur pour créer votre compte."
            );
        }

        return registerUser(request, role);
    }

    // =========================================================================
    // REGISTER BY ADMIN
    // =========================================================================
    @Override
    @Transactional
    public AuthResponse registerByAdmin(RegisterRequest request, Long adminId) {
        UserRole role = request.getRole() != null ? request.getRole() : UserRole.CLIENT;
        log.info("Création de compte par admin {}: {} avec rôle {}", adminId, request.getEmail(), role);
        return registerUser(request, role);
    }

    // =========================================================================
    // REFRESH TOKEN - Rotation sécurisée
    // =========================================================================
    @Override
    @Transactional
    public AuthResponse refreshToken(String refreshToken, String clientIp) {
        RefreshToken validToken = refreshTokenService.validateRefreshToken(refreshToken);
        User user = validToken.getUser();

        RefreshToken newToken = refreshTokenService.rotateRefreshToken(
            refreshToken, clientIp, "web-client"
        );

        log.debug("Refresh token renouvelé pour: {}", user.getEmail());
        return createAuthResponse(user, newToken.getToken());
    }

    // =========================================================================
    // LOGOUT - Révocation du refresh token
    // =========================================================================
    @Override
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.revokeToken(refreshToken);
            log.info("Utilisateur déconnecté, refresh token révoqué");
        }
    }

    // =========================================================================
    // GOOGLE LOGIN / REGISTER
    // =========================================================================
    @Override
    @Transactional
    public AuthResponse googleLogin(String idToken, String clientIp) {
        if (googleClientId == null || googleClientId.isBlank()) {
            log.warn("Google Client ID not configured - cannot verify Google token");
            throw new BadRequestException("Connexion Google non configurée. Contactez l'administrateur.");
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken googleIdToken;
        try {
            googleIdToken = verifier.verify(idToken);
        } catch (Exception e) {
            log.warn("Invalid Google ID token: {}", e.getMessage());
            throw new UnauthorizedException("Token Google invalide ou expiré");
        }

        if (googleIdToken == null) {
            throw new UnauthorizedException("Token Google invalide ou expiré");
        }

        GoogleIdToken.Payload payload = googleIdToken.getPayload();
        String email = payload.getEmail();
        String googleSub = payload.getSubject(); // Identifiant unique stable chez Google
        boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email non fourni par Google");
        }
        if (!emailVerified) {
            throw new BadRequestException("L'email Google n'est pas vérifié");
        }

        String givenName = (String) payload.get("given_name");
        String familyName = (String) payload.get("family_name");
        String name = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

        // 1) Lookup par provider + providerId (le plus fiable)
        Optional<User> byProvider = userRepository.findByOauthProviderAndOauthProviderId("GOOGLE", googleSub);
        // 2) Fallback par email (pour lier un compte existant)
        Optional<User> byEmail = byProvider.isPresent() ? Optional.empty() : userRepository.findByEmail(email);

        User user;

        if (byProvider.isPresent()) {
            // Utilisateur déjà lié à ce compte Google
            user = byProvider.get();
            if (!user.getIsActive()) {
                throw new ForbiddenException("Compte désactivé. Contactez l'administrateur.");
            }
            // Sync photo si changée
            if (pictureUrl != null && !pictureUrl.equals(user.getProfilePhotoUrl())) {
                user.setProfilePhotoUrl(pictureUrl);
            }
            log.info("Connexion Google réussie (providerId match): {}", email);

        } else if (byEmail.isPresent()) {
            // Compte existant (email/password ou autre) → liaison automatique au provider Google
            user = byEmail.get();
            if (!user.getIsActive()) {
                throw new ForbiddenException("Compte désactivé. Contactez l'administrateur.");
            }
            user.setOauthProvider("GOOGLE");
            user.setOauthProviderId(googleSub);
            if (pictureUrl != null && user.getProfilePhotoUrl() == null) {
                user.setProfilePhotoUrl(pictureUrl);
            }
            log.info("Connexion Google réussie - compte existant lié: {}", email);

        } else {
            // Inscription automatique en tant que CLIENT
            String firstName = (givenName != null && !givenName.isBlank()) ? givenName : (name != null ? name : "Prénom");
            String lastName = (familyName != null && !familyName.isBlank()) ? familyName : "";
            if (lastName.isEmpty() && name != null && name.contains(" ")) {
                String[] parts = name.split(" ", 2);
                if (parts.length == 2) {
                    firstName = parts[0];
                    lastName = parts[1];
                }
            }
            // Mot de passe aléatoire — l'utilisateur ne pourra se connecter que via Google
            String randomPassword = java.util.UUID.randomUUID().toString().replace("-", "") + "A1!";
            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(randomPassword))
                    .firstName(firstName)
                    .lastName(lastName)
                    .role(UserRole.CLIENT)
                    .isActive(true)
                    .profilePhotoUrl(pictureUrl)
                    .oauthProvider("GOOGLE")
                    .oauthProviderId(googleSub)
                    .build();
            user = userRepository.save(user);
            createClientProfile(user, RegisterRequest.builder()
                    .companyName(null)
                    .address(null)
                    .build());
            log.info("Inscription Google réussie (nouveau client): {} [sub={}]", email, googleSub);
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user, clientIp, "web-client");
        return createAuthResponse(user, refreshToken.getToken());
    }

    // =========================================================================
    // MÉTHODES PRIVÉES
    // =========================================================================

    private AuthResponse registerUser(RegisterRequest request, UserRole role) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Cet email est déjà utilisé: " + request.getEmail());
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Les mots de passe ne correspondent pas");
        }

        validatePasswordStrength(request.getPassword());

        User user = User.builder()
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .phone(request.getPhone())
            .role(role)
            .isActive(true)
            .build();

        user = userRepository.save(user);
        log.info("Utilisateur créé: {} avec rôle {}", user.getEmail(), role);

        if (role == UserRole.CLIENT) {
            createClientProfile(user, request);
        }

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(
            user, "127.0.0.1", "web-client"
        );

        return createAuthResponse(user, refreshToken.getToken());
    }

    private void validatePasswordStrength(String password) {
        if (password.length() < 8) {
            throw new BadRequestException("Le mot de passe doit contenir au moins 8 caractères");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new BadRequestException("Le mot de passe doit contenir au moins une majuscule");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new BadRequestException("Le mot de passe doit contenir au moins une minuscule");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new BadRequestException("Le mot de passe doit contenir au moins un chiffre");
        }
    }

    private void createClientProfile(User user, RegisterRequest request) {
        String clientCode = generateClientCode();
        Client client = Client.builder()
            .user(user)
            .clientCode(clientCode)
            .companyName(request.getCompanyName())
            .address(request.getAddress())
            .build();
        clientRepository.save(client);
        log.info("Profil client créé: {}", clientCode);
    }

    private String generateClientCode() {
        int year = Year.now().getValue();
        String prefix = String.format("CLI-%d-", year);
        Integer maxNumber = clientRepository.findMaxClientCodeNumber(prefix);
        int nextNumber = (maxNumber != null ? maxNumber : 0) + 1;
        return String.format("CLI-%d-%05d", year, nextNumber);
    }

    private AuthResponse createAuthResponse(User user, String refreshTokenValue) {
        String accessToken = jwtService.generateAccessToken(user);

        AuthResponse.UserInfo userInfo = AuthResponse.UserInfo.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .profilePhotoUrl(user.getProfilePhotoUrl())
            .oauthProvider(user.getOauthProvider())
            .build();

        return AuthResponse.of(accessToken, refreshTokenValue, jwtService.getAccessTokenExpiration(), userInfo);
    }

    // =========================================================================
    // FORGOT PASSWORD
    // =========================================================================
    @Override
    @Transactional
    public void forgotPassword(String email) {
        // Security: always succeed (don't reveal if email exists)
        Optional<User> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) {
            log.info("Forgot password requested for unknown email: {}", email);
            return;
        }
        User user = optUser.get();
        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);
        emailService.sendPasswordResetEmail(email, token);
        log.info("Password reset token generated for user: {}", email);
    }

    // =========================================================================
    // RESET PASSWORD
    // =========================================================================
    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new BadRequestException("Token invalide ou expiré"));
        if (user.getPasswordResetTokenExpiry() == null ||
            user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Token expiré. Veuillez refaire une demande.");
        }
        validatePasswordStrength(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);
        log.info("Password reset successfully for user: {}", user.getEmail());
    }

    // =========================================================================
    // VERIFY EMAIL
    // =========================================================================
    @Override
    @Transactional
    public void verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new BadRequestException("Token de vérification invalide"));
        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        userRepository.save(user);
        log.info("Email verified for user: {}", user.getEmail());
    }

    // =========================================================================
    // RESEND VERIFICATION EMAIL
    // =========================================================================
    @Override
    @Transactional
    public void resendVerificationEmail(String email) {
        Optional<User> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) {
            log.info("Resend verification requested for unknown email: {}", email);
            return; // Security: don't reveal if email exists
        }
        User user = optUser.get();
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            log.info("Email already verified for user: {}", email);
            return;
        }
        String token = UUID.randomUUID().toString();
        user.setEmailVerificationToken(token);
        userRepository.save(user);
        // TODO: Implement sendEmailVerification in EmailService
        log.info("[EMAIL PLACEHOLDER] Resend verification → {} | Token: {}...",
                email, token.substring(0, 8));
    }
}
