package com.billcom.mts.dto.ticket;

import com.billcom.mts.enums.TicketCategory;
import com.billcom.mts.enums.TicketPriority;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Requête de création d'un ticket")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketCreateRequest {

    @Schema(description = "Titre du ticket", example = "Panne BSCS facturation zone Sud", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @Schema(description = "Description détaillée de l'incident")
    private String description;

    @Schema(description = "ID du service télécom concerné", example = "1")
    private Long serviceId;

    @Schema(description = "Nom du service télécom concerné, utilisé si aucun serviceId valide n'est fourni")
    @Size(max = 100, message = "Service name must not exceed 100 characters")
    private String serviceName;

    @Schema(description = "Catégorie du ticket", example = "PANNE", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Category is required")
    private TicketCategory category;

    @Schema(description = "Priorité du ticket", example = "HIGH", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Priority is required")
    private TicketPriority priority;

    @Schema(description = "ID de l'agent à assigner (optionnel, MANAGER/ADMIN uniquement)")
    private Long assignedToId;

    @AssertTrue(message = "Service ID or service name is required")
    public boolean hasServiceTarget() {
        return serviceId != null || (serviceName != null && !serviceName.trim().isEmpty());
    }
}
