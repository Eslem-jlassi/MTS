package com.billcom.mts.dto.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Strong confirmation payload required for definitive admin hard-delete actions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminHardDeleteRequest {

    @NotBlank(message = "Le mot-cle de confirmation est obligatoire")
    private String confirmationKeyword;

    @NotBlank(message = "L'identifiant exact de la ressource est obligatoire")
    private String confirmationTargetId;

    @Size(max = 255, message = "Le mot de passe est trop long")
    private String currentPassword;

    @Size(max = 12, message = "Le code de verification est trop long")
    private String verificationCode;
}
