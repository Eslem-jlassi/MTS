package com.billcom.mts.dto.auth;

import com.billcom.mts.enums.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Reponse d'authentification contenant les tokens JWT et les infos utilisateur")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    public static final String STATUS_AUTHENTICATED = "AUTHENTICATED";
    public static final String STATUS_CREATED = "CREATED";
    public static final String STATUS_PENDING_EMAIL_VERIFICATION = "PENDING_EMAIL_VERIFICATION";

    @Schema(description = "Token d'acces JWT (duree 15 min)", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String accessToken;

    @Schema(description = "Token de rafraichissement (duree 7 jours)", example = "dGhpcyBpcyBhIHJlZnJlc2g...")
    private String refreshToken;

    @Schema(description = "Type de token", example = "Bearer")
    private String tokenType;

    @Schema(description = "Duree de validite en secondes", example = "900")
    private Long expiresIn;

    @Schema(description = "Informations de l'utilisateur")
    private UserInfo user;

    @Schema(description = "Indique si un compte doit verifier son adresse email avant connexion")
    private Boolean emailVerificationRequired;

    @Schema(description = "Indique si un email de verification a ete emis")
    private Boolean emailVerificationSent;

    @Schema(description = "Statut metier du flux auth", example = "PENDING_EMAIL_VERIFICATION")
    private String status;

    @Schema(description = "Informations resumees de l'utilisateur")
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        @Schema(description = "ID utilisateur", example = "1")
        private Long id;
        @Schema(description = "Email", example = "admin@mts-telecom.ma")
        private String email;
        @Schema(description = "Prenom", example = "Mohammed")
        private String firstName;
        @Schema(description = "Nom", example = "Benali")
        private String lastName;
        @Schema(description = "Role", example = "ADMIN")
        private UserRole role;
        @Schema(description = "URL photo de profil")
        private String profilePhotoUrl;
        @Schema(description = "Fournisseur OAuth (GOOGLE, etc.) ou null si email/password", example = "GOOGLE")
        private String oauthProvider;
        @Schema(description = "Adresse email deja verifiee", example = "true")
        private Boolean emailVerified;
    }

    public static AuthResponse of(String accessToken, String refreshToken, Long expiresIn, UserInfo user) {
        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(expiresIn)
            .user(user)
            .emailVerificationRequired(false)
            .emailVerificationSent(false)
            .status(accessToken != null ? STATUS_AUTHENTICATED : STATUS_CREATED)
            .build();
    }
}
