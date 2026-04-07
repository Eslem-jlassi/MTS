package com.billcom.mts.service;

import com.billcom.mts.exception.TooManyRequestsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthRateLimitServiceTest {

    private AuthRateLimitService service;

    @BeforeEach
    void setUp() {
        service = new AuthRateLimitService();

        ReflectionTestUtils.setField(service, "loginMaxAttempts", 2);
        ReflectionTestUtils.setField(service, "loginWindowSeconds", 60);
        ReflectionTestUtils.setField(service, "registerMaxAttempts", 2);
        ReflectionTestUtils.setField(service, "registerWindowSeconds", 60);
        ReflectionTestUtils.setField(service, "forgotPasswordMaxAttempts", 2);
        ReflectionTestUtils.setField(service, "forgotPasswordWindowSeconds", 60);
        ReflectionTestUtils.setField(service, "resetPasswordMaxAttempts", 2);
        ReflectionTestUtils.setField(service, "resetPasswordWindowSeconds", 60);
        ReflectionTestUtils.setField(service, "resendVerificationMaxAttempts", 2);
        ReflectionTestUtils.setField(service, "resendVerificationWindowSeconds", 60);
    }

    @Test
    @DisplayName("checkLogin should throw 429 after max attempts")
    void checkLogin_shouldThrowAfterThreshold() {
        service.checkLogin("127.0.0.1");
        service.checkLogin("127.0.0.1");

        assertThatThrownBy(() -> service.checkLogin("127.0.0.1"))
                .isInstanceOf(TooManyRequestsException.class)
                .satisfies(error -> {
                    TooManyRequestsException exception = (TooManyRequestsException) error;
                    assertThat(exception.getRetryAfterSeconds()).isGreaterThan(0);
                });
    }

    @Test
    @DisplayName("checkLogin should allow again when the window expires")
    void checkLogin_shouldResetAfterWindow() throws InterruptedException {
        ReflectionTestUtils.setField(service, "loginMaxAttempts", 1);
        ReflectionTestUtils.setField(service, "loginWindowSeconds", 1);

        service.checkLogin("10.0.0.10");
        assertThatThrownBy(() -> service.checkLogin("10.0.0.10"))
                .isInstanceOf(TooManyRequestsException.class);

        Thread.sleep(1100L);

        assertThatCode(() -> service.checkLogin("10.0.0.10")).doesNotThrowAnyException();
    }
}
