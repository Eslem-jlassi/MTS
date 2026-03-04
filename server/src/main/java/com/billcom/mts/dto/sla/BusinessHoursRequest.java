package com.billcom.mts.dto.sla;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO de requête pour créer/modifier des horaires ouvrés.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BusinessHoursRequest {

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100)
    private String name;

    @NotNull(message = "L'heure de début est obligatoire")
    @Min(0) @Max(23)
    private Integer startHour;

    @NotNull(message = "L'heure de fin est obligatoire")
    @Min(0) @Max(23)
    private Integer endHour;

    /** Jours ouvrés séparés par virgule (1=Lun..7=Dim), ex: "1,2,3,4,5" */
    @NotBlank(message = "Les jours ouvrés sont obligatoires")
    @Size(max = 30)
    private String workDays;

    @Size(max = 50)
    private String timezone;

    private Boolean isDefault;
    private Boolean active;
}
