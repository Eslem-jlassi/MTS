package com.billcom.mts.dto.chatbot;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatbotRequestDto {

    @NotBlank
    private String question;

    @JsonProperty("top_k")
    private Integer topK;

    @JsonProperty("preferred_language")
    private String preferredLanguage;

    public ChatbotRequestDto(String question, Integer topK) {
        this.question = question;
        this.topK = topK;
    }

    public ChatbotRequestDto(String question, Integer topK, String preferredLanguage) {
        this.question = question;
        this.topK = topK;
        this.preferredLanguage = preferredLanguage;
    }
}
