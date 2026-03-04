package com.billcom.mts.dto.auth;

import com.billcom.mts.enums.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Requête d'inscription d'un nouvel utilisateur")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 100)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    private String password;

    @NotBlank(message = "Password confirmation is required")
    private String confirmPassword;

    @NotBlank(message = "First name is required")
    @Size(max = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 50)
    private String lastName;

    @Size(max = 20)
    private String phone;

    /**
     * Role can only be set by ADMIN during creation.
     * Defaults to CLIENT for self-registration.
     */
    private UserRole role;

    // ========== Client-specific fields ==========
    
    /**
     * Company name (for CLIENT role).
     */
    @Size(max = 100)
    private String companyName;

    /**
     * Address (for CLIENT role).
     */
    private String address;
}
