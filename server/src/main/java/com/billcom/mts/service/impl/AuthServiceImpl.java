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
import com.billcom.mts.service.EmailService;
import com.billcom.mts.service.RefreshTokenService;
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
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.Base64;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

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

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${mts.allow-internal-signup:false}")
    private boolean allowInternalSignup;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Value("${app.auth.require-email-verification:false}")
    private boolean requireEmailVerification;

    @Value("${app.auth.email-verification.expiration-hours:24}")
    private long emailVerificationExpirationHours;

    @Value("${app.auth.password-reset.expiration-hours:1}")
    private long passwordResetExpirationHours;

    @Override
    public AuthResponse login(LoginRequest request, String clientIp) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (!StringUtils.hasText(normalizedEmail)) {
            throw new UnauthorizedException("Email ou mot de passe incorrect");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
            );

            User user = (User) authentication.getPrincipal();
            ensureEmailVerifiedForPasswordLogin(user);

            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);

            RefreshToken refreshToken = refreshTokenService.createRefreshToken(
                    user,
                    sanitizeClientIp(clientIp),
                    "web-client"
            );

            log.info("Login reussi: {} ({})", user.getEmail(), user.getRole());
            return createAuthResponse(user, refreshToken.getToken());
        } catch (AuthenticationException ex) {
            log.warn("Tentative de connexion echouee pour: {}", normalizedEmail);
            throw new UnauthorizedException("Email ou mot de passe incorrect");
        }
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request, String clientIp) {
        UserRole role = request.getRole() != null ? request.getRole() : UserRole.CLIENT;

        if (role != UserRole.CLIENT) {
            throw new ForbiddenException(
                    "L'inscription avec le role " + role + " n'est pas autorisee. "
                            + "Contactez un administrateur pour creer votre compte."
            );
        }

        return registerUser(request, role, clientIp, true);
    }

    @Override
    @Transactional
    public AuthResponse registerByAdmin(RegisterRequest request, Long adminId) {
        UserRole role = request.getRole() != null ? request.getRole() : UserRole.CLIENT;
        log.info("Creation de compte par admin {}: {} avec role {}", adminId, request.getEmail(), role);
        return registerUser(request, role, null, false);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(String refreshToken, String clientIp) {
        RefreshToken validToken = refreshTokenService.validateRefreshToken(refreshToken);
        User user = validToken.getUser();
        ensureEmailVerifiedForAuthenticatedSession(user, refreshToken);

        RefreshToken newToken = refreshTokenService.rotateRefreshToken(
                refreshToken,
                sanitizeClientIp(clientIp),
                "web-client"
        );

        log.debug("Refresh token renouvele pour: {}", user.getEmail());
        return createAuthResponse(user, newToken.getToken());
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        if (StringUtils.hasText(refreshToken)) {
            refreshTokenService.revokeToken(refreshToken);
            log.info("Utilisateur deconnecte, refresh token revoque");
        }
    }

    @Override
    @Transactional
    public AuthResponse googleLogin(String idToken, String clientIp) {
        if (!StringUtils.hasText(idToken)) {
            throw new BadRequestException("Token Google manquant");
        }

        String normalizedGoogleClientId = googleClientId == null ? "" : googleClientId.trim();
        if (!StringUtils.hasText(normalizedGoogleClientId)
                || !normalizedGoogleClientId.endsWith(".apps.googleusercontent.com")) {
            log.warn("Google Client ID not configured - cannot verify Google token");
            throw new BadRequestException("Connexion Google non configuree. Contactez l'administrateur.");
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        )
            .setAudience(Collections.singletonList(normalizedGoogleClientId))
                .build();

        GoogleIdToken googleIdToken;
        try {
            googleIdToken = verifier.verify(idToken);
        } catch (Exception ex) {
            log.warn("Invalid Google ID token: {}", ex.getMessage());
            throw new UnauthorizedException("Token Google invalide ou expire");
        }

        if (googleIdToken == null) {
            throw new UnauthorizedException("Token Google invalide ou expire");
        }

        GoogleIdToken.Payload payload = googleIdToken.getPayload();
        String email = payload.getEmail();
        String googleSub = payload.getSubject();
        boolean googleEmailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
        String normalizedEmail = normalizeEmail(email);

        if (!StringUtils.hasText(normalizedEmail)) {
            throw new BadRequestException("Email non fourni par Google");
        }
        if (!googleEmailVerified) {
            throw new BadRequestException("L'email Google n'est pas verifie");
        }

        String givenName = (String) payload.get("given_name");
        String familyName = (String) payload.get("family_name");
        String displayName = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

        Optional<User> byProvider = userRepository.findByOauthProviderAndOauthProviderId("GOOGLE", googleSub);
        Optional<User> byEmail = byProvider.isPresent()
            ? Optional.empty()
            : userRepository.findByEmail(normalizedEmail);

        User user;

        if (byProvider.isPresent()) {
            user = byProvider.get();
            if (!Boolean.TRUE.equals(user.getIsActive())) {
                throw new ForbiddenException("Compte desactive. Contactez l'administrateur.");
            }
            if (StringUtils.hasText(pictureUrl) && !pictureUrl.equals(user.getProfilePhotoUrl())) {
                user.setProfilePhotoUrl(pictureUrl);
            }
            markUserAsVerified(user);
            log.info("Connexion Google reussie (providerId match): {}", normalizedEmail);
        } else if (byEmail.isPresent()) {
            user = byEmail.get();
            if (!Boolean.TRUE.equals(user.getIsActive())) {
                throw new ForbiddenException("Compte desactive. Contactez l'administrateur.");
            }
            user.setOauthProvider("GOOGLE");
            user.setOauthProviderId(googleSub);
            if (StringUtils.hasText(pictureUrl) && !StringUtils.hasText(user.getProfilePhotoUrl())) {
                user.setProfilePhotoUrl(pictureUrl);
            }
            markUserAsVerified(user);
            log.info("Connexion Google reussie - compte existant lie: {}", normalizedEmail);
        } else {
            String firstName = StringUtils.hasText(givenName)
                    ? givenName
                    : (StringUtils.hasText(displayName) ? displayName : "Client");
            String lastName = StringUtils.hasText(familyName) ? familyName : "";

            if (!StringUtils.hasText(lastName) && StringUtils.hasText(displayName) && displayName.contains(" ")) {
                String[] parts = displayName.split(" ", 2);
                if (parts.length == 2) {
                    firstName = parts[0];
                    lastName = parts[1];
                }
            }

            String randomPassword = UUID.randomUUID().toString().replace("-", "") + "A1!";
            user = User.builder()
                    .email(normalizedEmail)
                    .password(passwordEncoder.encode(randomPassword))
                    .firstName(firstName)
                    .lastName(lastName)
                    .role(UserRole.CLIENT)
                    .isActive(true)
                    .profilePhotoUrl(pictureUrl)
                    .oauthProvider("GOOGLE")
                    .oauthProviderId(googleSub)
                    .emailVerified(true)
                    .build();
            user = userRepository.save(user);
            createClientProfile(user, RegisterRequest.builder().build());
            log.info("Inscription Google reussie (nouveau client): {} [sub={}]", normalizedEmail, googleSub);
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(
                user,
                sanitizeClientIp(clientIp),
                "web-client"
        );
        return createAuthResponse(user, refreshToken.getToken());
    }

    @Override
    @Transactional
    public void forgotPassword(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail)) {
            return;
        }

        Optional<User> optUser = userRepository.findByEmail(normalizedEmail);
        if (optUser.isEmpty()) {
            log.info("Forgot password requested for unknown email: {}", normalizedEmail);
            return;
        }

        User user = optUser.get();
        String token = generateSecureToken();
        user.setPasswordResetToken(hashToken(token));
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(passwordResetExpirationHours));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(normalizedEmail, token);
        log.info("Password reset token generated for user: {}", normalizedEmail);
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        String normalizedToken = normalizeOpaqueToken(token);
        if (!StringUtils.hasText(normalizedToken)) {
            throw new BadRequestException("Token invalide ou expire");
        }

        User user = findUserByPasswordResetToken(normalizedToken)
                .orElseThrow(() -> new BadRequestException("Token invalide ou expire"));

        if (user.getPasswordResetTokenExpiry() == null
                || user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Token expire. Veuillez refaire une demande.");
        }

        validatePasswordStrength(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);
        log.info("Password reset successfully for user: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void verifyEmail(String token, String email) {
        String normalizedToken = normalizeOpaqueToken(token);
        if (!StringUtils.hasText(normalizedToken)) {
            throw new BadRequestException("Token de verification invalide");
        }

        User user = findUserByEmailVerificationToken(normalizedToken)
                .orElseThrow(() -> new BadRequestException("Token de verification invalide"));

        String normalizedEmail = normalizeEmail(email);
        if (StringUtils.hasText(normalizedEmail) && !normalizedEmail.equals(user.getEmail())) {
            throw new BadRequestException("Token de verification invalide pour cette adresse email");
        }

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return;
        }

        if (user.getEmailVerificationTokenExpiry() == null
                || user.getEmailVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Le lien de verification a expire. Demandez un nouvel email.");
        }

        markUserAsVerified(user);
        userRepository.save(user);
        log.info("Email verified for user: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void resendVerificationEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail)) {
            return;
        }

        Optional<User> optUser = userRepository.findByEmail(normalizedEmail);
        if (optUser.isEmpty()) {
            log.info("Resend verification requested for unknown email: {}", normalizedEmail);
            return;
        }

        User user = optUser.get();
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            log.info("Email already verified for user: {}", normalizedEmail);
            return;
        }

        String rawVerificationToken = prepareEmailVerification(user);
        userRepository.save(user);

        emailService.sendEmailVerificationEmail(
                user.getEmail(),
                resolveRecipientName(user),
                rawVerificationToken,
                user.getEmailVerificationTokenExpiry()
        );
        log.info("Verification email resent for user: {}", normalizedEmail);
    }

    private AuthResponse registerUser(
            RegisterRequest request,
            UserRole role,
            String clientIp,
            boolean issueSessionTokens) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (!StringUtils.hasText(normalizedEmail)) {
            throw new BadRequestException("L'email est obligatoire");
        }

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Cet email est deja utilise: " + normalizedEmail);
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Les mots de passe ne correspondent pas");
        }

        validatePasswordStrength(request.getPassword());

        boolean verificationRequired = requireEmailVerification;
        String rawEmailVerificationToken = null;

        User user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .role(role)
                .isActive(true)
                .emailVerified(!verificationRequired)
                .build();

        if (verificationRequired) {
            rawEmailVerificationToken = prepareEmailVerification(user);
        } else {
            markUserAsVerified(user);
        }

        user = userRepository.save(user);
        log.info("Utilisateur cree: {} avec role {}", user.getEmail(), role);

        if (role == UserRole.CLIENT) {
            createClientProfile(user, request);
        }

        if (verificationRequired) {
            emailService.sendEmailVerificationEmail(
                    user.getEmail(),
                    resolveRecipientName(user),
                    rawEmailVerificationToken,
                    user.getEmailVerificationTokenExpiry()
            );
        }

        String refreshTokenValue = null;
        if (issueSessionTokens && !verificationRequired) {
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(
                    user,
                    sanitizeClientIp(clientIp),
                    "web-client"
            );
            refreshTokenValue = refreshToken.getToken();
        }

        AuthResponse response = createAuthResponse(user, refreshTokenValue);
        response.setEmailVerificationRequired(verificationRequired);
        response.setEmailVerificationSent(verificationRequired);
        if (verificationRequired) {
            response.setStatus(AuthResponse.STATUS_PENDING_EMAIL_VERIFICATION);
        }
        return response;
    }

    private void ensureEmailVerifiedForPasswordLogin(User user) {
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ForbiddenException("Veuillez vérifier votre adresse email avant de vous connecter.");
        }
    }

    private void ensureEmailVerifiedForAuthenticatedSession(User user, String refreshToken) {
        if (!requireEmailVerification || Boolean.TRUE.equals(user.getEmailVerified())) {
            return;
        }

        if (StringUtils.hasText(refreshToken)) {
            refreshTokenService.revokeToken(refreshToken);
        }

        throw new ForbiddenException("Veuillez vérifier votre adresse email avant de vous connecter.");
    }

    private String prepareEmailVerification(User user) {
        user.setEmailVerified(false);
        String rawToken = generateSecureToken();
        user.setEmailVerificationToken(hashToken(rawToken));
        user.setEmailVerificationTokenExpiry(LocalDateTime.now().plusHours(emailVerificationExpirationHours));
        return rawToken;
    }

    private void markUserAsVerified(User user) {
        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationTokenExpiry(null);
    }

    private String resolveRecipientName(User user) {
        String fullName = user.getFullName();
        return StringUtils.hasText(fullName) ? fullName : user.getEmail();
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String sanitizeClientIp(String clientIp) {
        if (!StringUtils.hasText(clientIp)) {
            return "unknown";
        }
        return clientIp.trim();
    }

    private String generateSecureToken() {
        byte[] buffer = new byte[32];
        secureRandom.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }

    private Optional<User> findUserByPasswordResetToken(String rawToken) {
        String hashedToken = hashToken(rawToken);
        Optional<User> hashedMatch = Optional.ofNullable(userRepository.findByPasswordResetToken(hashedToken))
                .orElse(Optional.empty());
        if (hashedMatch.isPresent()) {
            return hashedMatch;
        }

        Optional<User> legacyPlaintextMatch = Optional.ofNullable(userRepository.findByPasswordResetToken(rawToken))
                .orElse(Optional.empty());
        if (legacyPlaintextMatch.isPresent()) {
            log.info("Legacy plaintext password reset token accepted for user {}", legacyPlaintextMatch.get().getEmail());
        }
        return legacyPlaintextMatch;
    }

    private Optional<User> findUserByEmailVerificationToken(String rawToken) {
        String hashedToken = hashToken(rawToken);
        Optional<User> hashedMatch = Optional.ofNullable(userRepository.findByEmailVerificationToken(hashedToken))
                .orElse(Optional.empty());
        if (hashedMatch.isPresent()) {
            return hashedMatch;
        }

        Optional<User> legacyPlaintextMatch = Optional.ofNullable(userRepository.findByEmailVerificationToken(rawToken))
                .orElse(Optional.empty());
        if (legacyPlaintextMatch.isPresent()) {
            log.info("Legacy plaintext email verification token accepted for user {}", legacyPlaintextMatch.get().getEmail());
        }
        return legacyPlaintextMatch;
    }

    private String normalizeOpaqueToken(String token) {
        return token == null ? null : token.trim();
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Algorithme SHA-256 indisponible", ex);
        }
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new BadRequestException("Le mot de passe doit contenir au moins 8 caracteres");
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
        log.info("Profil client cree: {}", clientCode);
    }

    private String generateClientCode() {
        int year = Year.now().getValue();
        String prefix = String.format("CLI-%d-", year);
        Integer maxNumber = clientRepository.findMaxClientCodeNumber(prefix);
        int nextNumber = (maxNumber != null ? maxNumber : 0) + 1;
        return String.format("CLI-%d-%05d", year, nextNumber);
    }

    private AuthResponse createAuthResponse(User user, String refreshTokenValue) {
        String accessToken = StringUtils.hasText(refreshTokenValue)
                ? jwtService.generateAccessToken(user)
                : null;
        Long expiresIn = accessToken != null ? jwtService.getAccessTokenExpiration() : null;

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

        return AuthResponse.of(accessToken, refreshTokenValue, expiresIn, userInfo);
    }
}
