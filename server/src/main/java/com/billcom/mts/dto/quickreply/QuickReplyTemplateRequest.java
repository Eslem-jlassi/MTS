package com.billcom.mts.dto.quickreply;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for CREATE / UPDATE quick reply template.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickReplyTemplateRequest {

    @NotBlank(message = "Le nom est requis")
    @Size(max = 100)
    private String name;

    @NotBlank(message = "Le contenu est requis")
    private String content;

    @Size(max = 30)
    private String category;

    /** Comma-separated variable names, e.g. "{client},{ticketId}" */
    @Size(max = 500)
    private String variables;

    /** Rôle autorisé (AGENT, MANAGER, ADMIN). null = tous. */
    @Size(max = 20)
    private String roleAllowed;
}
