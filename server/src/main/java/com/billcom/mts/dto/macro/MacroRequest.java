package com.billcom.mts.dto.macro;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Création / mise à jour d'une macro. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MacroRequest {

    @NotBlank(message = "Le nom est requis")
    @Size(max = 100)
    private String name;

    @NotBlank(message = "Le contenu est requis")
    private String content;

    /** Rôle autorisé (AGENT, MANAGER, ADMIN) ou null pour tous. */
    @Size(max = 20)
    private String roleAllowed;
}
