package com.billcom.mts.dto.chatbot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChatbotResponseDtoTest {

    @Test
    @DisplayName("unavailable() returns clean French fallback message by default")
    void unavailableDefaultsToFrenchSafeMessage() {
        ChatbotResponseDto response = ChatbotResponseDto.unavailable("internal reason");

        assertThat(response.isAvailable()).isFalse();
        assertThat(response.getResponseLanguage()).isEqualTo("fr");
        assertThat(response.getAnswer()).isEqualTo("Assistant temporairement indisponible. Reessayez dans quelques instants.");
        assertThat(response.getMessage()).isEqualTo("Assistant temporairement indisponible. Reessayez dans quelques instants.");
        assertThat(response.getFallbackMode()).isEqualTo("service_unavailable");
        assertThat(response.getRiskFlags()).contains("SERVICE_UNAVAILABLE");
    }

    @Test
    @DisplayName("unavailable() supports English fallback copy when requested")
    void unavailableSupportsEnglishCopy() {
        ChatbotResponseDto response = ChatbotResponseDto.unavailable("internal reason", "en");

        assertThat(response.isAvailable()).isFalse();
        assertThat(response.getResponseLanguage()).isEqualTo("en");
        assertThat(response.getAnswer()).isEqualTo("Assistant temporarily unavailable. Please try again in a moment.");
        assertThat(response.getMessage()).isEqualTo("Assistant temporarily unavailable. Please try again in a moment.");
    }
}
