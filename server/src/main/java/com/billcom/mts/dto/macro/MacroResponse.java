package com.billcom.mts.dto.macro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Réponse DTO pour une macro. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MacroResponse {

    private Long id;
    private String name;
    private String content;
    private String roleAllowed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
