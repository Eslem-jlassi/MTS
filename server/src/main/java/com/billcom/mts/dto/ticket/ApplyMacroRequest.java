package com.billcom.mts.dto.ticket;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Requête pour appliquer une macro sur un ticket.
 * targetField: "solution" → remplit le champ resolution (ou pré-remplit pour RESOLVED)
 *              "comment" → ajoute un commentaire (optionnel isInternal)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplyMacroRequest {

    @NotNull(message = "L'ID de la macro est requis")
    private Long macroId;

    /** "solution" ou "comment" */
    private String targetField;

    /** Pour targetField=comment: true = note interne. */
    private Boolean isInternal;
}
