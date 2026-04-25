package com.billcom.mts.security;

import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(
                jwtService,
                "jwtSecret",
                "0123456789abcdef0123456789abcdef0123456789abcdef"
        );
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", 900_000L);
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", 604_800_000L);

        testUser = User.builder()
                .id(42L)
                .email("client@test.tn")
                .password("encodedPassword")
                .firstName("Client")
                .lastName("Test")
                .role(UserRole.CLIENT)
                .isActive(true)
                .emailVerified(true)
                .build();
    }

    @Test
    @DisplayName("generateRefreshToken should produce unique tokens for back-to-back requests")
    void generateRefreshToken_shouldProduceUniqueTokens() {
        String firstToken = jwtService.generateRefreshToken(testUser);
        String secondToken = jwtService.generateRefreshToken(testUser);

        assertThat(firstToken).isNotBlank();
        assertThat(secondToken).isNotBlank();
        assertThat(secondToken).isNotEqualTo(firstToken);
    }
}
