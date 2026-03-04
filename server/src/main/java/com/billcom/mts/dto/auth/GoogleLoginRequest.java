package com.billcom.mts.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Requête de connexion / inscription avec token Google ID")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoogleLoginRequest {

    @NotBlank(message = "Google ID token is required")
    @Schema(description = "Token ID renvoyé par Google après authentification", requiredMode = Schema.RequiredMode.REQUIRED)
    private String token;
}
