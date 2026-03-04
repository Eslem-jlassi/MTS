package com.billcom.mts.dto.auth;

import com.billcom.mts.enums.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Réponse d'authentification contenant les tokens JWT et les infos utilisateur")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    @Schema(description = "Token d'accès JWT (durée 15 min)", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String accessToken;

    @Schema(description = "Token de rafraîchissement (durée 7 jours)", example = "dGhpcyBpcyBhIHJlZnJlc2g...")
    private String refreshToken;

    @Schema(description = "Type de token", example = "Bearer")
    private String tokenType;

    @Schema(description = "Durée de validité en secondes", example = "900")
    private Long expiresIn;

    @Schema(description = "Informations de l'utilisateur")
    private UserInfo user;

    @Schema(description = "Informations résumées de l'utilisateur")
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        @Schema(description = "ID utilisateur", example = "1")
        private Long id;
        @Schema(description = "Email", example = "admin@billcom.tn")
        private String email;
        @Schema(description = "Prénom", example = "Admin")
        private String firstName;
        @Schema(description = "Nom", example = "Billcom")
        private String lastName;
        @Schema(description = "Rôle", example = "ADMIN")
        private UserRole role;
        @Schema(description = "URL photo de profil")
        private String profilePhotoUrl;
        @Schema(description = "Fournisseur OAuth (GOOGLE, etc.) ou null si email/password", example = "GOOGLE")
        private String oauthProvider;
    }

    public static AuthResponse of(String accessToken, String refreshToken, Long expiresIn, UserInfo user) {
        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(expiresIn)
            .user(user)
            .build();
    }
}
