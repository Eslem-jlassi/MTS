package com.billcom.mts.dto.ai;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SentimentAnalysisRequestDto {

    @NotBlank
    private String title;

    private String description;
}
