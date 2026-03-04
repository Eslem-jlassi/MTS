package com.billcom.mts.dto.incident;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentNoteRequest {

    @NotBlank(message = "Note content is required")
    private String content;
}
