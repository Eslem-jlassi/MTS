package com.billcom.mts.dto;

import com.billcom.mts.dto.auth.LoginRequest;
import com.billcom.mts.dto.auth.RegisterRequest;
import com.billcom.mts.dto.incident.IncidentRequest;
import com.billcom.mts.dto.ticket.TicketCreateRequest;
import com.billcom.mts.dto.sla.SlaPolicyRequest;
import com.billcom.mts.enums.Severity;
import com.billcom.mts.enums.TicketCategory;
import com.billcom.mts.enums.TicketPriority;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitaires pour la validation Bean Validation (JSR-380) des DTOs.
 * Vérifie que les contraintes @NotBlank, @Email, @Size, @NotNull
 * sont bien appliquées sur tous les DTOs d'entrée.
 */
class DtoValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    // =========================================================================
    // LoginRequest
    // =========================================================================
    @Nested
    @DisplayName("LoginRequest validation")
    class LoginRequestTests {

        @Test
        @DisplayName("Valid login request passes validation")
        void validRequest() {
            LoginRequest req = LoginRequest.builder()
                    .email("user@test.com")
                    .password("password123")
                    .build();
            Set<ConstraintViolation<LoginRequest>> violations = validator.validate(req);
            assertThat(violations).isEmpty();
        }

        @Test
        @DisplayName("Blank email is rejected")
        void blankEmail() {
            LoginRequest req = LoginRequest.builder()
                    .email("")
                    .password("password123")
                    .build();
            Set<ConstraintViolation<LoginRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
        }

        @Test
        @DisplayName("Invalid email format is rejected")
        void invalidEmail() {
            LoginRequest req = LoginRequest.builder()
                    .email("not-an-email")
                    .password("password123")
                    .build();
            Set<ConstraintViolation<LoginRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
        }

        @Test
        @DisplayName("Short password is rejected (min=6)")
        void shortPassword() {
            LoginRequest req = LoginRequest.builder()
                    .email("user@test.com")
                    .password("abc")
                    .build();
            Set<ConstraintViolation<LoginRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("password"));
        }
    }

    // =========================================================================
    // RegisterRequest
    // =========================================================================
    @Nested
    @DisplayName("RegisterRequest validation")
    class RegisterRequestTests {

        @Test
        @DisplayName("Valid register request passes validation")
        void validRequest() {
            RegisterRequest req = RegisterRequest.builder()
                    .email("new@test.com")
                    .password("Password1")
                    .confirmPassword("Password1")
                    .firstName("John")
                    .lastName("Doe")
                    .build();
            Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(req);
            assertThat(violations).isEmpty();
        }

        @Test
        @DisplayName("Missing firstName is rejected")
        void missingFirstName() {
            RegisterRequest req = RegisterRequest.builder()
                    .email("new@test.com")
                    .password("Password1")
                    .confirmPassword("Password1")
                    .lastName("Doe")
                    .build();
            Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("firstName"));
        }

        @Test
        @DisplayName("Email too long is rejected (max=100)")
        void emailTooLong() {
            String longEmail = "a".repeat(95) + "@test.com"; // > 100 chars
            RegisterRequest req = RegisterRequest.builder()
                    .email(longEmail)
                    .password("Password1")
                    .confirmPassword("Password1")
                    .firstName("John")
                    .lastName("Doe")
                    .build();
            Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
        }
    }

    // =========================================================================
    // TicketCreateRequest
    // =========================================================================
    @Nested
    @DisplayName("TicketCreateRequest validation")
    class TicketCreateRequestTests {

        @Test
        @DisplayName("Valid ticket request passes validation")
        void validRequest() {
            TicketCreateRequest req = TicketCreateRequest.builder()
                    .title("Problème de facturation")
                    .serviceId(1L)
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.HIGH)
                    .build();
            Set<ConstraintViolation<TicketCreateRequest>> violations = validator.validate(req);
            assertThat(violations).isEmpty();
        }

        @Test
        @DisplayName("Blank title is rejected")
        void blankTitle() {
            TicketCreateRequest req = TicketCreateRequest.builder()
                    .title("")
                    .serviceId(1L)
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.HIGH)
                    .build();
            Set<ConstraintViolation<TicketCreateRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("title"));
        }

        @Test
        @DisplayName("Title too long is rejected (max=200)")
        void titleTooLong() {
            TicketCreateRequest req = TicketCreateRequest.builder()
                    .title("A".repeat(201))
                    .serviceId(1L)
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.HIGH)
                    .build();
            Set<ConstraintViolation<TicketCreateRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
        }

        @Test
        @DisplayName("Null serviceId is rejected")
        void nullServiceId() {
            TicketCreateRequest req = TicketCreateRequest.builder()
                    .title("Valid title")
                    .category(TicketCategory.PANNE)
                    .priority(TicketPriority.HIGH)
                    .build();
            Set<ConstraintViolation<TicketCreateRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("serviceTarget"));
        }

        @Test
        @DisplayName("Null priority is rejected")
        void nullPriority() {
            TicketCreateRequest req = TicketCreateRequest.builder()
                    .title("Valid title")
                    .serviceId(1L)
                    .category(TicketCategory.PANNE)
                    .build();
            Set<ConstraintViolation<TicketCreateRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("priority"));
        }
    }

    // =========================================================================
    // IncidentRequest
    // =========================================================================
    @Nested
    @DisplayName("IncidentRequest validation")
    class IncidentRequestTests {

        @Test
        @DisplayName("Valid incident request passes validation")
        void validRequest() {
            IncidentRequest req = IncidentRequest.builder()
                    .title("Panne réseau")
                    .severity(Severity.CRITICAL)
                    .serviceId(1L)
                    .startedAt(LocalDateTime.now())
                    .build();
            Set<ConstraintViolation<IncidentRequest>> violations = validator.validate(req);
            assertThat(violations).isEmpty();
        }

        @Test
        @DisplayName("Null severity is rejected")
        void nullSeverity() {
            IncidentRequest req = IncidentRequest.builder()
                    .title("Panne réseau")
                    .serviceId(1L)
                    .startedAt(LocalDateTime.now())
                    .build();
            Set<ConstraintViolation<IncidentRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
            assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("severity"));
        }
    }

    // =========================================================================
    // SlaPolicyRequest
    // =========================================================================
    @Nested
    @DisplayName("SlaPolicyRequest validation")
    class SlaPolicyRequestTests {

        @Test
        @DisplayName("Valid SLA policy request passes validation")
        void validRequest() {
            SlaPolicyRequest req = SlaPolicyRequest.builder()
                    .name("Critical SLA")
                    .priority(TicketPriority.CRITICAL)
                    .resolutionTimeHours(4)
                    .build();
            Set<ConstraintViolation<SlaPolicyRequest>> violations = validator.validate(req);
            assertThat(violations).isEmpty();
        }

        @Test
        @DisplayName("Name too short is rejected (min=2)")
        void nameTooShort() {
            SlaPolicyRequest req = SlaPolicyRequest.builder()
                    .name("A")
                    .priority(TicketPriority.CRITICAL)
                    .resolutionTimeHours(4)
                    .build();
            Set<ConstraintViolation<SlaPolicyRequest>> violations = validator.validate(req);
            assertThat(violations).isNotEmpty();
        }
    }
}
