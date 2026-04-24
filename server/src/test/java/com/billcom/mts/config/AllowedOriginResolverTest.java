package com.billcom.mts.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AllowedOriginResolverTest {

    @Test
    @DisplayName("ajoute les variantes localhost:3001 en developpement")
    void resolve_addsLocalDevelopmentOrigins() {
        List<String> origins = AllowedOriginResolver.resolve(
                "http://localhost:3000,http://127.0.0.1:3000",
                "http://localhost:3000"
        );

        assertThat(origins).contains(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001"
        );
    }

    @Test
    @DisplayName("n injecte pas d origines localhost en production")
    void resolve_keepsProductionOriginsFocused() {
        List<String> origins = AllowedOriginResolver.resolve(
                "https://support.example.com,https://admin.example.com",
                "https://support.example.com"
        );

        assertThat(origins).containsExactly(
                "https://support.example.com",
                "https://admin.example.com"
        );
    }
}
