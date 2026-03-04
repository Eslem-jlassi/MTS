package com.billcom.mts.dto.ticket;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Requête d'ajout de commentaire")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketCommentRequest {

    @Schema(description = "Contenu du commentaire", example = "Investigation en cours, logs collectés.", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Comment content is required")
    private String content;

    /**
     * Mark as internal note (visible only to agents/managers).
     * Defaults to false (public comment).
     */
    private Boolean isInternal;
}
